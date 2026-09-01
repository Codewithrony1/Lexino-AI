import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClerkServerClient } from '@/lib/clerk';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const results: any = {
    timestamp: new Date().toISOString(),
    overallStatus: 'OPERATIONAL',
    components: {},
    system: {
      uptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      platform: process.platform,
    },
  };

  // 1. Check PostgreSQL Database
  const dbStart = Date.now();
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      const [userCount, sessionCount, messageCount] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.chatSession.count().catch(() => 0),
        prisma.message.count().catch(() => 0),
      ]);

      results.components.database = {
        name: 'PostgreSQL Database (Neon / Supabase)',
        status: 'OPERATIONAL',
        latencyMs: dbLatency,
        metrics: {
          totalUsers: userCount,
          totalChatSessions: sessionCount,
          totalMessages: messageCount,
        },
      };
    } else {
      results.components.database = {
        name: 'PostgreSQL Database',
        status: 'DEGRADED',
        error: 'DATABASE_URL not configured',
      };
    }
  } catch (dbErr: any) {
    results.components.database = {
      name: 'PostgreSQL Database',
      status: 'MAJOR_OUTAGE',
      latencyMs: Date.now() - dbStart,
      error: dbErr.message || 'Connection failed',
    };
    results.overallStatus = 'DEGRADED';
  }

  // 2. Check Clerk Identity Platform
  const clerkStart = Date.now();
  try {
    const clerk = getClerkServerClient();
    const count = await clerk.users.getCount();
    results.components.clerk = {
      name: 'Clerk Authentication & Identity',
      status: 'OPERATIONAL',
      latencyMs: Date.now() - clerkStart,
      metrics: { registeredUsers: count },
    };
  } catch (clerkErr: any) {
    results.components.clerk = {
      name: 'Clerk Authentication & Identity',
      status: 'DEGRADED',
      latencyMs: Date.now() - clerkStart,
      error: clerkErr.message || 'Clerk verification failed',
    };
  }

  // 3. Check Groq AI Inference
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqStart = Date.now();
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
        signal: AbortSignal.timeout(5000),
      });
      results.components.groq = {
        name: 'Groq AI Inference Core (GPT-OSS 120B / LLaMA)',
        status: groqRes.ok ? 'OPERATIONAL' : 'DEGRADED',
        latencyMs: Date.now() - groqStart,
        httpCode: groqRes.status,
      };
    } catch (e: any) {
      results.components.groq = {
        name: 'Groq AI Inference Core',
        status: 'DEGRADED',
        error: e.message || 'Timeout / unreachable',
      };
    }
  } else {
    results.components.groq = {
      name: 'Groq AI Inference Core',
      status: 'CONFIG_MISSING',
      message: 'GROQ_API_KEY environment variable not set',
    };
  }

  // 4. Check OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openaiStart = Date.now();
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      results.components.openai = {
        name: 'OpenAI API Core (GPT-4o)',
        status: openaiRes.ok ? 'OPERATIONAL' : 'DEGRADED',
        latencyMs: Date.now() - openaiStart,
        httpCode: openaiRes.status,
      };
    } catch (e: any) {
      results.components.openai = {
        name: 'OpenAI API Core',
        status: 'DEGRADED',
        error: e.message || 'Timeout / unreachable',
      };
    }
  } else {
    results.components.openai = {
      name: 'OpenAI API Core',
      status: 'CONFIG_MISSING',
      message: 'OPENAI_API_KEY not configured',
    };
  }

  // 5. Check Anthropic Claude API
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    results.components.anthropic = {
      name: 'Anthropic Claude API (Sonnet 3.5)',
      status: 'OPERATIONAL',
      message: 'API Key configured',
    };
  } else {
    results.components.anthropic = {
      name: 'Anthropic Claude API',
      status: 'CONFIG_MISSING',
      message: 'ANTHROPIC_API_KEY not configured',
    };
  }

  // 6. Check Razorpay Payment Gateway
  const razorpayKey = process.env.RAZORPAY_KEY_ID;
  results.components.razorpay = {
    name: 'Razorpay Payment Gateway & Subscriptions',
    status: razorpayKey ? 'OPERATIONAL' : 'CONFIG_MISSING',
    environment: razorpayKey?.startsWith('rzp_live') ? 'LIVE PRODUCTION' : 'TEST/SANDBOX',
  };

  results.totalCheckDurationMs = Date.now() - startTime;
  return NextResponse.json(results);
}
