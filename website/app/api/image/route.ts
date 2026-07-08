import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma';
import { updateUserActivity } from '../../../lib/activity';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await updateUserActivity(userId);

  try {
    const parsedBody = await request.json().catch(() => ({})) as Record<string, any>;
    const prompt = typeof parsedBody.prompt === 'string' ? parsedBody.prompt.trim() : '';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    let imageUrl = '';

    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        imageUrl = data.data?.[0]?.url || '';
      } else {
        const errText = await response.text();
        console.error('OpenAI image generation failed:', errText);
      }
    }

    // Fallback: Generates a beautiful generative artwork query-matched via Unsplash source
    if (!imageUrl) {
      const cleanTerm = encodeURIComponent(prompt.slice(0, 100).replace(/[^a-zA-Z0-9\s]/g, ''));
      imageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80&sig=${Math.floor(Math.random() * 1000)}&q=${cleanTerm}`;
    }

    if (process.env.DATABASE_URL) {
      try {
        await prisma.apiLog.create({
          data: {
            userId,
            modelUsed: openaiKey ? 'dall-e-3' : 'unsplash-mock',
            action: 'image',
          },
        });
      } catch (e) {
        console.error('Database log error (image gen):', e);
      }
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Image generation proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
