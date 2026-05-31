import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FEEDBACK_FILE = path.join(process.cwd(), 'feedback.json');

// Memory fallback for serverless environments where disk write is read-only
let feedbackMemoryCache: any[] = [
  { id: '1', name: 'Alex Rivera', email: 'alex@example.com', msg: 'Timetable LAI is amazing! It completely changed how I study for JEE.', rating: 5, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', name: 'Zoe Kapoor', email: 'zoe@example.com', msg: 'Predict LAI is interesting, but I would love to see more outcome simulations.', rating: 4, createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: '3', name: 'Dev Sharma', email: 'dev@example.com', msg: 'The dashboard works really fast. High performance, congrats.', rating: 5, createdAt: new Date(Date.now() - 3600000 * 48).toISOString() }
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, msg, rating } = body;

    if (!name || !email || !msg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      msg,
      rating: Number(rating) || 5,
      createdAt: new Date().toISOString()
    };

    // Attempt file save
    try {
      let feedbacks = [];
      if (fs.existsSync(FEEDBACK_FILE)) {
        const raw = fs.readFileSync(FEEDBACK_FILE, 'utf8');
        feedbacks = JSON.parse(raw || '[]');
      }
      feedbacks.unshift(newFeedback);
      fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf8');
    } catch (fsErr) {
      // Serverless fallback
      feedbackMemoryCache.unshift(newFeedback);
      console.warn('Fallback to memory for feedback saving:', fsErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback submission error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export function getFeedbacksFromStore() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const raw = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      return JSON.parse(raw || '[]');
    }
  } catch (e) {}
  return feedbackMemoryCache;
}
