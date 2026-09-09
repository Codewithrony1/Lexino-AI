/**
 * Lexino AI 2.0 — Epistemic Context Window & Memory Manager
 * 
 * Solves the critical context amnesia problem:
 * 1. Anchors the initial user problem/goal so multi-turn Socratic dialogues never lose the core target.
 * 2. Retains a rolling window of recent conversational turns (10 turns).
 * 3. Compresses intermediate turns into an Epistemic Context Block capturing active concepts, hypotheses, and milestones.
 */

export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export interface EpistemicContextResult {
  consolidatedSystemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  initialAnchor?: string;
}

/**
 * Extracts key pedagogical and conceptual terms from intermediate messages
 * to build an informative semantic memory block rather than an arbitrary character slice.
 */
function summarizeIntermediateHistory(items: ChatHistoryItem[]): string {
  if (items.length === 0) return '';

  const userNotes: string[] = [];
  const assistantMilestones: string[] = [];

  for (const item of items) {
    const text = item.content.trim();
    if (!text) continue;

    if (item.role === 'user') {
      // Capture student's attempts or key inquiries (truncated cleanly)
      const clean = text.replace(/\n+/g, ' ').slice(0, 120);
      userNotes.push(clean);
    } else {
      // Capture assistant's guiding direction (first sentence or up to 120 chars)
      const firstSentence = text.split(/[.?!]\s/)[0] || text;
      const clean = firstSentence.replace(/\n+/g, ' ').slice(0, 120);
      assistantMilestones.push(clean);
    }
  }

  const parts: string[] = [];
  if (userNotes.length > 0) {
    parts.push(`Student's prior points: "${userNotes.slice(-3).join('; ')}"`);
  }
  if (assistantMilestones.length > 0) {
    parts.push(`Prior milestones guided: "${assistantMilestones.slice(-2).join('; ')}"`);
  }

  return `[Epistemic Context Memory: ${parts.join(' | ')}. Maintain continuity and do not re-ask already answered questions.]`;
}

/**
 * Assembles the context window preserving initial goal anchor,
 * semantic memory of intermediate progress, and the immediate turns.
 */
export function buildEpistemicContextMessages(
  history: ChatHistoryItem[] = [],
  currentContent: string,
  baseSystemPrompt: string,
  recentTurnLimit: number = 10
): EpistemicContextResult {
  const safeHistory = Array.isArray(history)
    ? history.filter((h) => h && typeof h.content === 'string' && (h.role === 'user' || h.role === 'assistant'))
    : [];

  let initialAnchor: string | undefined;
  let intermediateSummary = '';
  let activeWindow: ChatHistoryItem[] = [];

  if (safeHistory.length <= recentTurnLimit) {
    // History is compact enough to include in full
    activeWindow = safeHistory;
    // Identify the first user question as the topic anchor if more than 2 turns
    const firstUserMsg = safeHistory.find((m) => m.role === 'user');
    if (firstUserMsg && safeHistory.length > 2) {
      initialAnchor = firstUserMsg.content.slice(0, 280);
    }
  } else {
    // 1. Anchor the initial question/problem from the very start of the session
    const firstUserMsg = safeHistory.find((m) => m.role === 'user');
    if (firstUserMsg) {
      initialAnchor = firstUserMsg.content.slice(0, 280);
    }

    // 2. Extract recent messages
    activeWindow = safeHistory.slice(-recentTurnLimit);

    // 3. Summarize the intermediate messages that fell out of the active window
    const intermediateMessages = safeHistory.slice(0, -recentTurnLimit);
    intermediateSummary = summarizeIntermediateHistory(intermediateMessages);
  }

  // Build the enriched system prompt
  let consolidatedSystemPrompt = baseSystemPrompt;

  if (initialAnchor) {
    consolidatedSystemPrompt += `\n\n[PRIMARY SESSION TOPIC / PROBLEM ANCHOR]:\n"${initialAnchor}"\n(Always stay anchored to solving or addressing this primary topic across multi-turn exchanges)`;
  }

  if (intermediateSummary) {
    consolidatedSystemPrompt += `\n\n${intermediateSummary}`;
  }

  // Construct message array with sane per-message size boundaries
  const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: consolidatedSystemPrompt },
  ];

  for (const h of activeWindow) {
    formattedMessages.push({
      role: h.role,
      content: h.content.slice(0, 4000), // Protect against token blowouts from massive raw pastes
    });
  }

  formattedMessages.push({
    role: 'user',
    content: currentContent.slice(0, 4000),
  });

  return {
    consolidatedSystemPrompt,
    messages: formattedMessages,
    initialAnchor,
  };
}
