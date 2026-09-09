import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma';
import { restoreChatSession } from '../../../lib/chatCompression';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

import { 
  classifyUserIntent, 
  getRecommendedTemperature, 
  getSystemPromptForRequest, 
  AGENT_PEDAGOGICAL_PROMPTS 
} from '../../../lib/pedagogy/socraticEngine';
import { buildEpistemicContextMessages } from '../../../lib/pedagogy/contextManager';

export const AGENT_SYSTEM_PROMPTS = AGENT_PEDAGOGICAL_PROMPTS;

// Style adaptation prompts for simulated personas
const CHATGPT_STYLE_PROMPT = `Respond with the characteristic clear, direct, and structured tone of ChatGPT (GPT-4o), employing tables, lists, and formatted explanations, but always maintain your identity as Lexino AI.`;
const CLAUDE_STYLE_PROMPT = `Respond with the characteristic tone of Claude: intellectually deep, analytical, polite, admitting limitations, excellent at coding and long-form analysis, but always maintain your identity as Lexino AI.`;



export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const safeMaxTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(Math.floor(maxTokens), 4096) : 2048;
    const content = typeof parsedBody.content === 'string' ? parsedBody.content.trim() : '';
    const sessionId = typeof parsedBody.sessionId === 'string' && parsedBody.sessionId.trim()
      ? parsedBody.sessionId.trim()
      : `session-${Date.now()}`;
    
    // Pedagogical intent classification & temperature tuning
    const userIntent = classifyUserIntent(content);
    const temperature = getRecommendedTemperature(userIntent);


    if (!content) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    // A. Check user limits and active cooldowns
    let userTier = 'FREE';
    let userCooldownUntil: Date | null = null;
    let messageCount = 0;

    let curUser: any = null;
    try {
      const { currentUser } = await import('@clerk/nextjs/server');
      curUser = await currentUser();
    } catch (_) {}

    const clerkTier = (curUser?.publicMetadata?.tier as string) || 'FREE';
    const clerkStatus = (curUser?.publicMetadata?.subscriptionStatus as string) || (clerkTier !== 'FREE' ? 'active' : 'inactive');
    const clerkExpiresAt = (curUser?.publicMetadata?.subscriptionExpiresAt as string) || null;

    let dbUser: any = null;

    if (process.env.DATABASE_URL) {
      try {
        dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!dbUser || (dbUser.tier === 'FREE' && clerkTier !== 'FREE')) {
          if (curUser) {
            const { syncCanonicalUser } = await import('@/lib/userAccount');
            dbUser = await syncCanonicalUser({
              id: userId,
              email: curUser.emailAddresses[0]?.emailAddress || '',
              name: `${curUser.firstName || ''} ${curUser.lastName || ''}`.trim() || curUser.username,
              avatarUrl: curUser.imageUrl,
              tier: clerkTier,
              subscriptionStatus: clerkStatus,
              subscriptionExpiresAt: clerkExpiresAt,
            });
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ [Chat API] Database lookup warning:', dbErr);
      }
    }

    const effectiveUser = dbUser || {
      id: userId,
      tier: clerkTier,
      subscriptionStatus: clerkStatus,
      subscriptionExpiresAt: clerkExpiresAt ? new Date(clerkExpiresAt) : null,
    };

    const { getUserEntitlements, isModelAllowedForUser } = await import('@/lib/entitlements');
    const entitlements = getUserEntitlements(effectiveUser);
    userTier = entitlements.tier;

    // Enforce model lock server-side (cannot be bypassed by frontend payload)
    if (!isModelAllowedForUser(selectedModel, effectiveUser)) {
      return NextResponse.json({
        error: 'premium_model_locked',
        message: `The model '${selectedModel}' requires a ${selectedModel.includes('claude') ? 'Pro / Unlimited' : 'Student'} subscription. Please upgrade to unlock.`,
      }, { status: 403 });
    }

    if (dbUser && process.env.DATABASE_URL) {
      try {
        // If expired, auto-update database user record
        if (entitlements.isExpired && dbUser.tier !== 'FREE') {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: {
                tier: 'FREE',
                subscriptionStatus: 'expired',
              },
            });
          } catch (_) {}
        }

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

        const limit = entitlements.dailyQueryLimit;
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
      } catch (limitErr) {
        console.error('Error during quota validation:', limitErr);
      }
    }

    // B. Sync User and Message to Database (concurrent safe writes)
    if (process.env.DATABASE_URL) {
      try {
        // If session was archived/compressed, seamlessly restore before appending new turn
        const existingSession = await prisma.chatSession.findUnique({
          where: { id: sessionId },
          select: { storageState: true },
        });

        if (existingSession?.storageState === 'COMPRESSED') {
          await restoreChatSession(sessionId);
        }

        await Promise.all([
          prisma.user.upsert({
            where: { id: userId },
            update: {
              messageCountToday: { increment: 1 },
              lastMessageAt: new Date(),
            },
            create: { id: userId, email: `${userId}@placeholder.clerk.accounts`, name: 'User', messageCountToday: 1, lastMessageAt: new Date() },
          }),
          prisma.chatSession.upsert({
            where: { id: sessionId },
            update: { updatedAt: new Date(), lastInteractionAt: new Date(), storageState: 'HOT' },
            create: { id: sessionId, userId, title: content.slice(0, 46) || 'New chat' },
          }),
          prisma.message.create({
            data: {
              sessionId,
              userId,
              role: 'user',
              content,
            },
          }),
        ]);
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

    const activeAssistant = (typeof parsedBody.activeAssistant === 'string' && parsedBody.activeAssistant.trim())
      ? parsedBody.activeAssistant.trim()
      : (selectedModel === 'timetable-ai' ? 'timetable-lai' : 'default');

    let actualModel = selectedModel;
    let systemPrompt = getSystemPromptForRequest(activeAssistant, userIntent);

    if (activeAssistant === 'timetable-lai' || selectedModel === 'timetable-ai') {
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
      actualModel = 'openai/gpt-oss-120b';
      systemPrompt = getSystemPromptForRequest('timetable-lai', userIntent);
      apiBody = {
        model: actualModel,
        max_tokens: 2048,
        stream: true,
        temperature,
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
          temperature,
        };
      } else {
        // Fallback to Groq GPT-OSS 120B
        apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        apiHeaders = {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        };
        actualModel = 'openai/gpt-oss-120b';
        systemPrompt = `${getSystemPromptForRequest('default', userIntent)}\n\n${CHATGPT_STYLE_PROMPT}`;
        apiBody = {
          model: actualModel,
          max_tokens: safeMaxTokens,
          stream: true,
          temperature,
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
          temperature,
        };
      } else {
        // Fallback to Groq GPT-OSS 120B
        apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        apiHeaders = {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        };
        actualModel = 'openai/gpt-oss-120b';
        systemPrompt = `${getSystemPromptForRequest('default', userIntent)}\n\n${CLAUDE_STYLE_PROMPT}`;
        apiBody = {
          model: actualModel,
          max_tokens: safeMaxTokens,
          stream: true,
          temperature,
        };
      }
    } else {
      // Default to Groq GPT-OSS 120B / Qwen
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiHeaders = {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      };
      actualModel = selectedModel === 'qwen/qwen3.6-27b' ? 'qwen/qwen3.6-27b' : 'openai/gpt-oss-120b';
      systemPrompt = getSystemPromptForRequest(activeAssistant, userIntent);
      apiBody = {
        model: actualModel,
        max_tokens: safeMaxTokens,
        stream: true,
        temperature,
      };
    }

    // Build Epistemic Context Window (preserves session goal anchor & 10 recent turns)
    const rawHistory = Array.isArray(parsedBody.history) ? parsedBody.history : [];
    const epistemicContext = buildEpistemicContextMessages(
      rawHistory,
      content,
      systemPrompt,
      10
    );

    if (modelFormat === 'openai') {
      apiBody.messages = epistemicContext.messages;
      apiBody.temperature = temperature;
    } else {
      // Anthropic does not support "system" in message history, it requires it in a top-level parameter
      apiBody.system = epistemicContext.consolidatedSystemPrompt;
      apiBody.messages = epistemicContext.messages.filter((m) => m.role !== 'system');
      apiBody.temperature = temperature;
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
