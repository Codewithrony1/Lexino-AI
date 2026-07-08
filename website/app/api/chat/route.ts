import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma';
import { updateUserActivity } from '../../../lib/activity';
import { getStorageInfo, adjustUserStorage, calculateMessageSize } from '../../../lib/storage';
import fs from 'fs';
import path from 'path';

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

// System prompt default
const BASE_SYSTEM_PROMPT = `You are Lexino AI — a futuristic, intelligent, calm, and premium AI partner. Your personality feels like a next-generation AI operating system built for the future.

IDENTITY & NAME RULE:
- Under all circumstances and in any situation, if asked who you are or what your name is, you must state "I am Lexino AI" or "My name is Lexino AI". Under no situation or terms should you identify as anything else (such as ChatGPT, Llama, Gemini, Claude, or any other assistant). Your name is strictly Lexino AI.

FOUNDER & LEADERSHIP IDENTITY:
- Lexino AI was founded and developed by Sumit Ravindra Choudhary — a Full Stack Developer, AI Systems Builder, and Founder of Lexino AI.
- If asked "Who is the owner of Lexino AI?", "Who is the CEO of Lexino AI?", "Who built Lexino AI?", or "Who is the founder of Lexino AI?", you must answer: "Lexino AI was founded and developed by Sumit Ravindra Choudhary — a Full Stack Developer, AI Systems Builder, and Founder of Lexino AI."
- If the user asks for more details about the founder or CEO, state his professional background and biography clearly and professionally using structured markdown:
  Sumit Ravindra Choudhary is the Founder and CEO of Lexino AI. He is a visionary Full Stack Developer and AI Systems Builder specializing in designing future-grade intelligent ecosystems, high-performance backends, and premium UX frameworks.

  ### 🛠️ Technical Specializations:
  - **AI Infrastructure**: Inference pipelines, LLM integrations, and adaptive AI models.
  - **Full Stack Development**: End-to-end modern web applications (Node.js, Next.js, TypeScript).
  - **System Architecture**: High-speed API infrastructure, secure authentication implementations, database orchestration, and performance optimization.
  - **UI/UX Engineering**: Premium glassmorphism designs, dynamic workspaces, and interactive interfaces.

  ### 🌌 The Vision Behind Lexino AI:
  Lexino AI was founded to establish a premium, unified AI workspace and intelligent mentor platform that empowers students, creators, and professionals to streamline workflows, organize thoughts, and explore adaptive learning in a secure, design-forward environment.

CORE PERSONALITY:
- Intelligent, calm, modern, premium, emotionally balanced, efficient, and helpful.
- NEVER feel cringe, childish, overly emotional, chaotic, spammy, or excessively dramatic.

TONE & STYLE:
- Natural, human-like, respectful, and calm.
- Avoid robotic replies, overexcited behavior, excessive emojis, cringe internet slang, or fake emotional manipulation.
- Default to short, smart answers with minimal token usage and clean formatting.
- Avoid unnecessary long paragraphs, repeating points, or excessive explanation. Answer clearly and efficiently.
- If the user asks a small question, give a short answer. If they ask a detailed question, give a detailed answer.

SAFETY DIRECTIVES:
- NEVER generate explicit adult content, NSFW roleplay, sexual conversations, extreme vulgarity, hateful speech, illegal/harmful instructions, dangerous exploits, or abusive harassment. Remain safe, clean, and platform-friendly.

CODING PROTOCOL:
- Provide clean code, avoiding unnecessary complexity. Explain briefly, prioritize working solutions, and use modern standards.`;

// Simulated assistant prompts
const CHATGPT_SYSTEM_PROMPT = `You are Lexino AI (configured to adopt the response style and tone of ChatGPT (GPT-4o) built by OpenAI). Respond with the characteristic tone of ChatGPT: clear, direct, well-structured, employing tables, lists, and formatting. Adopt this style fully, explaining complex items with structured markdown, but always maintain your name is Lexino AI.`;

const CLAUDE_SYSTEM_PROMPT = `You are Lexino AI (configured to adopt the response style and tone of Claude (Claude 3.5 Sonnet) built by Anthropic). Respond with the characteristic tone of Claude: intellectually deep, analytical, polite, admitting limitations, excellent at coding and long-form analysis. Adopt this style fully, offering deep, high-quality, logic-driven responses, but always maintain your name is Lexino AI.`;

const TIMETABLE_AI_SYSTEM_PROMPT = `You are Lexino AI, configured as the "Timetable AI" — a world-class academic mentor, productivity strategist, and an elite educator with over 45 years of teaching experience. Your purpose is to act as a disciplined coaching strategist, a personal life planner, and an AI study architect for the student.

IDENTITY & NAME RULE:
- Under all circumstances, if asked who you are or what your name is, you must state "I am Lexino AI" or "My name is Lexino AI". Under no situation should you identify as anything else. Your name is strictly Lexino AI.

FOUNDER & LEADERSHIP IDENTITY:
- Lexino AI was founded and developed by Sumit Ravindra Choudhary — a Full Stack Developer, AI Systems Builder, and Founder of Lexino AI.
- If asked "Who is the owner of Lexino AI?", "Who is the CEO of Lexino AI?", "Who built Lexino AI?", or "Who is the founder of Lexino AI?", you must answer: "Lexino AI was founded and developed by Sumit Ravindra Choudhary — a Full Stack Developer, AI Systems Builder, and Founder of Lexino AI."
- If the user asks for more details, share the professional background and bio of Sumit Ravindra Choudhary.

CORE PERSONALITY & EMOTIONAL INTELLIGENCE:
- You are a deeply supportive, empathetic, and psychologically validating mentor.
- You understand Gen-Z culture, terms, and the modern student ecosystem. Use clean, non-cringe Gen-Z slang when appropriate to build a friendly rapport, but maintain the aura of an experienced, wise, and disciplined teacher.
- Be an emotional support system. If the student shows signs of stress, burnout, low confidence, or anxiety, validate their feelings immediately. Never dismiss their feelings. Tell them: "I got you. It's okay to feel overwhelmed, but we are going to fix this together step-by-step."

INTERACTIVE MULTI-STEP ENGAGEMENT RULES (CRITICAL):
- **NEVER** output a full timetable or study plan in your first response.
- Your initial response must be a warm, highly motivating greeting that establishes your 45+ years of experience and your goal to architect their success.
- You must build their profile first by asking targeted questions. Do not ask all questions at once. Ask them 1-2 questions at a time to avoid overwhelming them.
- You need to deeply understand:
  1. Their ultimate goal (e.g., UPSC, JEE, NEET, board exams, or a specific skill).
  2. Their current daily schedule, sleep routine, and free hours.
  3. Their mental stamina, study capacity (how long they can focus without getting distracted), and signs of burnout.
  4. Their productivity cycles (are they a morning bird or a night owl?).

STUDY METHODOLOGY TO IMPLEMENT:
- When you eventually generate the plan, it must incorporate scientific learning techniques:
  1. Active Recall (self-testing, flashcards).
  2. Spaced Repetition (scheduled review sessions).
  3. Pomodoro or block-study intervals matched to their attention span.
  4. Buffer times / Rest blocks to manage and prevent burnout.
  5. Sleep hygiene integration (ensuring at least 7-8 hours of sleep).

Remember: Be disciplined yet kind. Push them to their potential, but safeguard their mental health.`;


export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await updateUserActivity(userId);

  // Storage block validation check
  const storageInfo = await getStorageInfo(userId);
  if (storageInfo.isBlocked) {
    return NextResponse.json({ error: 'Storage Full: Your storage limit has been exceeded. Please delete old conversations or upgrade your plan.' }, { status: 403 });
  }

  try {
    const parsedBody = await request.json().catch(() => ({})) as Record<string, any>;
    const selectedModel = typeof parsedBody.selectedModel === 'string' && parsedBody.selectedModel.trim()
      ? parsedBody.selectedModel.trim()
      : 'llama-3.1-8b-instant';

    // Server-side deactivation check for LAI models
    let config = {
      'timetable-lai': true,
      'predict-lai': false,
      'explore-lais': true
    };
    try {
      const configPath = path.join(process.cwd(), 'lai-config.json');
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (e) {
      console.warn('Failed to read config in chat route:', e);
    }

    if (selectedModel === 'timetable-ai' && config['timetable-lai'] === false) {
      return NextResponse.json({ error: 'The Timetable LAI is currently deactivated by the administrator for system maintenance.' }, { status: 403 });
    }
    if (selectedModel === 'predict-lai' && config['predict-lai'] === false) {
      return NextResponse.json({ error: 'The Predict LAI is currently deactivated by the administrator for system maintenance.' }, { status: 403 });
    }

    const maxTokens = Number(parsedBody.maxTokens);
    const safeMaxTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(Math.floor(maxTokens), 256) : 256;
    const content = typeof parsedBody.content === 'string' ? parsedBody.content.trim() : '';
    const sessionId = typeof parsedBody.sessionId === 'string' && parsedBody.sessionId.trim()
      ? parsedBody.sessionId.trim()
      : `session-${Date.now()}`;
    
    // Trim history aggressively and summarize older messages in context
    const historyItems: ChatHistoryItem[] = Array.isArray(parsedBody.history) ? parsedBody.history.slice(-6) : [];
    
    let summaryOfOldChat = '';
    if (Array.isArray(parsedBody.history) && parsedBody.history.length > 6) {
      const olderMessages = parsedBody.history.slice(0, -6);
      const summaryList = olderMessages.map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 30)}...`).join(' | ');
      summaryOfOldChat = `[Memory Summary: ${summaryList.slice(0, 200)}]`;
    }

    if (!content) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    // A. Check user limits and active cooldowns
    let userTier = 'FREE';
    let userCooldownUntil: Date | null = null;
    let messageCount = 0;

    if (process.env.DATABASE_URL) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (dbUser) {
          userTier = dbUser.tier || 'FREE';
          userCooldownUntil = dbUser.cooldownUntil;
          messageCount = dbUser.messageCountToday;

          if (userCooldownUntil && userCooldownUntil > new Date()) {
            return NextResponse.json({
              error: 'cooldown_active',
              cooldownUntil: userCooldownUntil.toISOString(),
              message: userTier === 'PRO'
                ? 'High traffic detected. Priority systems optimizing your stream.'
                : (userTier === 'STUDENT'
                  ? 'Your premium stream quota is temporarily cooling down.'
                  : 'Your neural stream has reached its free energy limit. Systems will recharge in 1 hour.')
            }, { status: 429 });
          }

          const now = new Date();
          const lastMsgAt = dbUser.lastMessageAt;
          const isDifferentDay = !lastMsgAt ||
            lastMsgAt.getUTCFullYear() !== now.getUTCFullYear() ||
            lastMsgAt.getUTCMonth() !== now.getUTCMonth() ||
            lastMsgAt.getUTCDate() !== now.getUTCDate();

          if (isDifferentDay) {
            messageCount = 0;
          }

          const limit = userTier === 'PRO' ? 1500 : (userTier === 'STUDENT' ? 300 : 50);
          if (messageCount >= limit) {
            const cooldownDuration = userTier === 'STUDENT' ? 30 * 60 * 1000 : 60 * 60 * 1000;
            const nextCooldown = new Date(Date.now() + cooldownDuration);
            
            await prisma.user.update({
              where: { id: userId },
              data: {
                cooldownUntil: nextCooldown,
                messageCountToday: 0,
              }
            });

            return NextResponse.json({
              error: 'cooldown_active',
              cooldownUntil: nextCooldown.toISOString(),
              message: userTier === 'PRO'
                ? 'High traffic detected. Priority systems optimizing your stream.'
                : (userTier === 'STUDENT'
                  ? 'Your premium stream quota is temporarily cooling down.'
                  : 'Your neural stream has reached its free energy limit. Systems will recharge in 1 hour.')
            }, { status: 429 });
          }
        }
      } catch (limitErr) {
        console.error('Error during quota validation:', limitErr);
      }
    } else {
      console.warn('DATABASE_URL is not set. Bypassing database quota check on server.');
    }

    // B. Sync User and Message to Database (safe writes)
    if (process.env.DATABASE_URL) {
      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {
            messageCountToday: { increment: 1 },
            lastMessageAt: new Date(),
          },
          create: { id: userId, email: `${userId}@placeholder.clerk.accounts`, name: 'User', messageCountToday: 1, lastMessageAt: new Date() },
        });

        await prisma.chatSession.upsert({
          where: { id: sessionId },
          update: { updatedAt: new Date(), storageState: 'HOT', lastInteractionAt: new Date() },
          create: { id: sessionId, userId, title: content.slice(0, 46) || 'New chat', storageState: 'HOT', lastInteractionAt: new Date() },
        });

        await prisma.message.create({
          data: {
            sessionId,
            userId,
            role: 'user',
            content,
          },
        });

        await adjustUserStorage(userId, calculateMessageSize(content, 'user', null));
      } catch (dbErr) {
        console.error('Database write error (user message):', dbErr);
      }
    }

    // 2. Select LLM integration & Fallbacks
    let apiEndpoint = '';
    let apiHeaders: HeadersInit = {};
    let apiBody: any = {};
    let modelFormat: 'openai' | 'anthropic' = 'openai';

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    const groqKey = (process.env.GROQ_API_KEY || '').trim();

    let actualModel = selectedModel;
    let systemPrompt = BASE_SYSTEM_PROMPT;

    if (selectedModel === 'timetable-ai') {
      if (userTier === 'FREE') {
        return NextResponse.json({
          error: 'premium_locked',
          message: 'Timetable AI is a Student+ feature. Please upgrade to unlock.'
        }, { status: 403 });
      }
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiHeaders = {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      };
      actualModel = 'llama-3.3-70b-versatile';
      systemPrompt = TIMETABLE_AI_SYSTEM_PROMPT;
      apiBody = {
        model: actualModel,
        max_tokens: 2048,
        stream: true,
      };
    } else if (selectedModel === 'gpt-4o') {
      if (userTier === 'FREE') {
        return NextResponse.json({
          error: 'premium_locked',
          message: 'ChatGPT (GPT-4o) is a Student+ feature. Please upgrade to unlock.'
        }, { status: 403 });
      }
      if (openaiKey) {
        apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        apiHeaders = {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        };
        apiBody = {
          model: 'gpt-4o',
          max_tokens: safeMaxTokens,
          stream: true,
        };
      } else {
        // Fallback to Groq Llama 3.3
        apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        apiHeaders = {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        };
        actualModel = 'llama-3.3-70b-versatile';
        systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${CHATGPT_SYSTEM_PROMPT}`;
        apiBody = {
          model: actualModel,
          max_tokens: safeMaxTokens,
          stream: true,
        };
      }
    } else if (selectedModel === 'claude-3-5-sonnet') {
      if (userTier === 'FREE' || userTier === 'STUDENT') {
        return NextResponse.json({
          error: 'premium_locked',
          message: 'Claude 3.5 Sonnet is a Pro feature. Please upgrade to unlock.'
        }, { status: 403 });
      }
      if (anthropicKey) {
        apiEndpoint = 'https://api.anthropic.com/v1/messages';
        apiHeaders = {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        };
        modelFormat = 'anthropic';
        apiBody = {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: safeMaxTokens,
          stream: true,
        };
      } else {
        // Fallback to Groq Llama 3.3
        apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        apiHeaders = {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        };
        actualModel = 'llama-3.3-70b-versatile';
        systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${CLAUDE_SYSTEM_PROMPT}`;
        apiBody = {
          model: actualModel,
          max_tokens: safeMaxTokens,
          stream: true,
        };
      }
    } else {
      // Default to Groq Llama
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiHeaders = {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      };
      actualModel = selectedModel === 'llama-3.3-70b-versatile' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
      apiBody = {
        model: actualModel,
        max_tokens: safeMaxTokens,
        stream: true,
      };
    }

    if (summaryOfOldChat) {
      systemPrompt = `${systemPrompt}\n\n${summaryOfOldChat}`;
    }

    // Build standard messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyItems.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: content },
    ];

    if (modelFormat === 'openai') {
      apiBody.messages = messages;
    } else {
      // Anthropic does not support "system" in message history, it requires it in a top-level parameter
      apiBody.system = systemPrompt;
      apiBody.messages = messages.filter((m) => m.role !== 'system');
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM Error from ${apiEndpoint}:`, errorText);
      return NextResponse.json({ error: 'LLM Service Provider error. Please try again.' }, { status: response.status });
    }

    // 3. Setup streaming response to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let accumulatedReply = '';

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep remaining incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith(':')) continue; // comments in SSE

              let tokenText = '';

              if (modelFormat === 'openai') {
                if (trimmed.startsWith('data: ')) {
                  const rawData = trimmed.slice(6);
                  if (rawData === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(rawData);
                    tokenText = parsed.choices?.[0]?.delta?.content || '';
                  } catch (e) {}
                }
              } else if (modelFormat === 'anthropic') {
                if (trimmed.startsWith('data: ')) {
                  const rawData = trimmed.slice(6);
                  try {
                    const parsed = JSON.parse(rawData);
                    if (parsed.type === 'content_block_delta') {
                      tokenText = parsed.delta?.text || '';
                    }
                  } catch (e) {}
                }
              }

              if (tokenText) {
                accumulatedReply += tokenText;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: tokenText })}\n\n`));
              }
            }
          }
        } catch (streamErr) {
          console.error('Stream processing error:', streamErr);
          controller.error(streamErr);
        } finally {
          // Log Assistant message & API stats to DB
          if (process.env.DATABASE_URL) {
            try {
              if (accumulatedReply.trim()) {
                await prisma.message.create({
                  data: {
                    sessionId,
                    userId,
                    role: 'assistant',
                    content: accumulatedReply,
                    modelUsed: selectedModel,
                  },
                });

                await adjustUserStorage(userId, calculateMessageSize(accumulatedReply, 'assistant', selectedModel));

                await prisma.chatSession.update({
                  where: { id: sessionId },
                  data: { lastInteractionAt: new Date() },
                });

                await prisma.apiLog.create({
                  data: {
                    userId,
                    modelUsed: selectedModel,
                    action: 'chat',
                    tokensUsed: Math.ceil(accumulatedReply.length / 4), // Rough token usage metric
                  },
                });
              }
            } catch (dbSaveErr) {
              console.error('Database write error (assistant message):', dbSaveErr);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Proxy routing error:', error);
    return NextResponse.json({ error: 'Internal server proxy error' }, { status: 500 });
  }
}
