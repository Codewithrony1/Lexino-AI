import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getRateLimitHeaders } from '../../../lib/rateLimit';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit to prevent serverless OOM

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate Limiting: 20 uploads per minute per user
  const rateLimit = checkRateLimit(`upload:${userId}`, 20, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: 'Too many file uploads. Please slow down and try again shortly.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'payload_too_large', message: 'File exceeds the maximum allowable size of 10MB.' },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';
    const nameLower = file.name.toLowerCase();

    // 1. Text & Source Code files
    if (
      nameLower.endsWith('.txt') ||
      nameLower.endsWith('.js') ||
      nameLower.endsWith('.ts') ||
      nameLower.endsWith('.tsx') ||
      nameLower.endsWith('.py') ||
      nameLower.endsWith('.html') ||
      nameLower.endsWith('.css') ||
      nameLower.endsWith('.json') ||
      nameLower.endsWith('.md') ||
      nameLower.endsWith('.csv') ||
      nameLower.endsWith('.xml')
    ) {
      extractedText = buffer.toString('utf-8');
    } else if (nameLower.endsWith('.pdf')) {
      // Basic PDF text extraction parser (safe, regex-based stream reader)
      const pdfString = buffer.toString('binary');
      const matches = pdfString.match(/\(([^)]+)\)\s*T[j*]/g) || [];
      extractedText = matches
        .map((m) => {
          // Extract text inside parenthesis
          const start = m.indexOf('(');
          const end = m.lastIndexOf(')');
          if (start !== -1 && end !== -1) {
            return m.slice(start + 1, end);
          }
          return '';
        })
        .filter(Boolean)
        .join(' ');

      if (!extractedText.trim()) {
        extractedText = `[PDF Document: ${file.name} - Text content could not be extracted directly. Size: ${file.size} bytes]`;
      }
    } else {
      extractedText = `[Attached File: ${file.name} (${file.type || 'Unknown Type'}) - Size: ${file.size} bytes]`;
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      text: extractedText,
    });
  } catch (error) {
    console.error('File upload extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 500 });
  }
}
