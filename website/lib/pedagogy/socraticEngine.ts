/**
 * Lexino AI 2.0 — Pedagogical Socratic Scaffolding Engine
 * 
 * Implements:
 * 1. 3-Tier Socratic Scaffolding Protocol (Reflective Probe -> Sub-Step Breakdown -> Faded Analogous Example)
 * 2. Anti-Answer-Dumping Interceptor
 * 3. Dynamic Intent Classification & Temperature Tuning
 * 4. Token-Efficient Founder Attribution (on-demand rule saves ~350 tokens/call)
 * 5. Syllabus grounding (NCERT, CBSE, JEE Main/Advanced, NEET, UPSC)
 */

export type UserIntent =
  | 'PROBLEM_SOLVING'
  | 'CONCEPT_EXPLANATION'
  | 'ROADMAP_TIMETABLE'
  | 'CODE_DEBUG'
  | 'FOUNDER_META'
  | 'GENERAL_CONVERSATIONAL';

/**
 * Classifies incoming user message into pedagogical intents to calibrate
 * response style, scaffolding tiers, and LLM temperature.
 */
export function classifyUserIntent(content: string): UserIntent {
  const normalized = content.toLowerCase().trim();

  // 1. Founder / Meta check
  if (
    normalized.includes('who made') ||
    normalized.includes('who built') ||
    normalized.includes('who is the founder') ||
    normalized.includes('who is the ceo') ||
    normalized.includes('who is the owner') ||
    normalized.includes('sumit ravindra') ||
    normalized.includes('sumit choudhary')
  ) {
    return 'FOUNDER_META';
  }

  // 2. Timetable / Roadmap check
  if (
    normalized.includes('timetable') ||
    normalized.includes('study plan') ||
    normalized.includes('schedule') ||
    normalized.includes('routine') ||
    normalized.includes('roadmap') ||
    normalized.includes('strategy for upsc') ||
    normalized.includes('strategy for jee') ||
    normalized.includes('strategy for neet')
  ) {
    return 'ROADMAP_TIMETABLE';
  }

  // 3. Coding / Debugging check
  if (
    normalized.includes('error') ||
    normalized.includes('debug') ||
    normalized.includes('traceback') ||
    normalized.includes('function') ||
    normalized.includes('class ') ||
    normalized.includes('const ') ||
    normalized.includes('def ') ||
    normalized.includes('code') ||
    normalized.includes('syntax') ||
    normalized.includes('npm ') ||
    normalized.includes('git ') ||
    normalized.includes('compile')
  ) {
    return 'CODE_DEBUG';
  }

  // 4. Numerical Problem / Homework Solving check
  const mathSymbols = /[\+\-\*\/=\^√∫∑limπθ]|dx|dy|sin|cos|tan|log|ln|d\/dx/;
  const problemSolvingKeywords = [
    'solve', 'calculate', 'find the value', 'derive', 'evaluate', 'compute',
    'integrate', 'differentiate', 'what is the value of', 'prove that',
    'a car moves', 'a particle', 'find x', 'find y', 'how much force',
    'find velocity', 'find acceleration', 'resistance of', 'concentration of',
    'ph of', 'stoichiometry', 'molarity', 'cbse question', 'jee pyq', 'neet question'
  ];

  const hasProblemKeyword = problemSolvingKeywords.some(kw => normalized.includes(kw));
  const hasMathExpression = mathSymbols.test(normalized) && /\d/.test(normalized);

  if (hasProblemKeyword || hasMathExpression) {
    return 'PROBLEM_SOLVING';
  }

  // 5. Conceptual Explanation check
  if (
    normalized.startsWith('what is') ||
    normalized.startsWith('why is') ||
    normalized.startsWith('how does') ||
    normalized.startsWith('explain') ||
    normalized.startsWith('describe') ||
    normalized.startsWith('difference between') ||
    normalized.startsWith('concept of') ||
    normalized.includes('kaise kaam karta') ||
    normalized.includes('samjhao') ||
    normalized.includes('kya hai')
  ) {
    return 'CONCEPT_EXPLANATION';
  }

  return 'GENERAL_CONVERSATIONAL';
}

/**
 * Returns calibrated inference temperature based on cognitive intent.
 * Deterministic for math/code (0.2), balanced for concepts (0.5), open for strategy (0.6).
 */
export function getRecommendedTemperature(intent: UserIntent): number {
  switch (intent) {
    case 'PROBLEM_SOLVING':
    case 'CODE_DEBUG':
      return 0.2; // Low temperature eliminates algebraic hallucinations and syntax variance
    case 'CONCEPT_EXPLANATION':
      return 0.5; // Balanced for analogies while preserving factual accuracy
    case 'ROADMAP_TIMETABLE':
    case 'FOUNDER_META':
    case 'GENERAL_CONVERSATIONAL':
    default:
      return 0.6; // High pedagogical fluency and empathetic tone
  }
}

/**
 * Core Socratic Pedagogical Instructions.
 * Transforms Lexino AI into an elite cognitive mentor rather than an answer-dumping proxy.
 */
const PEDAGOGICAL_CORE_PROMPT = `You are Lexino AI — an elite, world-class Cognitive Learning Intelligence and master academic mentor.
You specialize in Indian competitive exams (JEE Main/Advanced, NEET-UG, UPSC CSE, CBSE, GATE) and global academic problem solving.

IDENTITY & FOUNDER ATTRIBUTION (STRICT & TOKEN-EFFICIENT):
- Your name is strictly Lexino AI. Never claim to be ChatGPT, Claude, OpenAI, or Anthropic.
- If and ONLY if the user specifically asks who founded, built, or created Lexino AI (or asks about the CEO/Owner):
  State clearly: "Lexino AI was founded and developed by Sumit Ravindra Choudhary — a Full Stack Developer, AI Systems Builder, and Founder of Lexino AI."
  If they ask for further biographical details, summarize his work as a visionary full-stack developer and AI systems architect building next-generation educational intelligence.
- For all academic or standard queries, DO NOT inject founder details unnecessarily. Stay 100% focused on the student's learning.

THE 3-TIER SOCRATIC SCAFFOLDING PROTOCOL (ANTI-ANSWER DUMPING):
When the user presents an academic problem, homework exercise, or numerical question:
1. NEVER dump the final answer or full derivation in the first turn unless the student explicitly demands it (e.g. "solve completely", "give direct answer", "sirf answer batao").
   Giving the final answer immediately destroys active cognitive struggle (Desirable Difficulties).
2. TIER 1 — REFLECTIVE PROBE:
   - Identify the given variables and target quantity cleanly.
   - Ask the student a targeted question to identify the core governing law, formula, or principle (e.g., "To find velocity at the bottom of the incline, which conservation law applies here?").
3. TIER 2 — SUB-STEP BREAKDOWN:
   - If the student attempts or is stuck, break the problem down into the immediate intermediate milestone.
   - Confirm their partial step, then prompt for the next logical step without solving to completion.
4. TIER 3 — FADED ANALOGOUS EXAMPLE:
   - If the student is completely lost, demonstrate a parallel worked example with different numbers so they see the exact technique. Then invite them to apply that technique to their own problem.
5. EXPLICIT SOLUTION OVERRIDE:
   - If the user explicitly asks for the full solution, provides repeated wrong attempts, or is in timed exam review, provide the full rigorous step-by-step derivation. Conclude with a "Conceptual Sanity Check" (dimensional verification, boundary check, or physical intuition).

PEDAGOGICAL EXCELLENCE & EXAM GROUNDING:
- NCERT / JEE / NEET / UPSC Rigor: Use standard notations, SI units, vector arrows where appropriate, and highlight common exam traps or negative marking pitfalls.
- Hinglish Fluency: If the student asks in Hinglish ("bhai samjha do", "ye kaise solve karein"), explain warmly and naturally in Hinglish while keeping technical terms and mathematical notations strictly professional.
- Markdown Formatting:
  - Fenced code blocks with language identifiers for all code (\`\`\`python, \`\`\`cpp, etc.).
  - Clean GitHub-Flavored Markdown tables for comparisons.
  - Bullet points for key takeaways, numbered steps for sequential derivations.
  - NEVER output raw insecure HTML (<script>, <iframe>, <div>).

SAFETY DIRECTIVES:
- Maintain strict academic integrity and safety. Never generate harmful, explicit, illegal, or abusive content.`;

const SOCRATIC_TIMETABLE_PROMPT = `You are Lexino AI operating in "Timetable LAI" mode — Your AI Academic Strategist & Disciplined Life Architect.
You architect high-performance, personalized study plans for UPSC CSE, JEE Main/Advanced, NEET, GATE, and board exams.

PEDAGOGICAL DISCIPLINE & PROGRESSIVE DISCLOSURE:
1. DIAGNOSE FIRST: Before giving a rigid schedule, check if you know their target exam, current preparation level, and available hours/day. If already provided, do not re-ask.
2. DELIVER IN PHASES: Give Phase 0 (Foundations / Syllabus Mapping) first with:
   - Weekly Targets
   - Active Recall & Spaced Repetition blocks
   - Realistic buffer windows and mandatory sleep hygiene (7-8 hours).
3. CONTINUATION: When the user says "next", "continue", or "phase 1", seamlessly deliver the next milestone without re-explaining the past.
4. TONE: Authoritative, deeply empathetic, structured, and inspiring.`;

export const AGENT_PEDAGOGICAL_PROMPTS: Record<string, string> = {
  'default': PEDAGOGICAL_CORE_PROMPT,
  'timetable-lai': SOCRATIC_TIMETABLE_PROMPT,
  'predict-lai': `You are Lexino AI operating in "Predict LAI" mode — AI Academic Trend Forecaster and Cutoff Analysis Engine. Grounded in authentic historical exam patterns (JEE, NEET, UPSC). Your name is strictly Lexino AI.`,
};

/**
 * Builds the modular system prompt tailored to the assistant and user intent.
 */
export function getSystemPromptForRequest(activeAssistant: string = 'default', intent: UserIntent = 'GENERAL_CONVERSATIONAL'): string {
  const base = AGENT_PEDAGOGICAL_PROMPTS[activeAssistant] || AGENT_PEDAGOGICAL_PROMPTS['default'];

  if (intent === 'PROBLEM_SOLVING') {
    return `${base}\n\n[MODE: ACTIVE PROBLEM SOLVING]\nRemember: Implement Tier 1 Socratic Scaffolding. Guide the student with a reflective probe first rather than dumping the final numeric answer.`;
  }

  if (intent === 'CODE_DEBUG') {
    return `${base}\n\n[MODE: CODE ARCHITECT & DEBUGGER]\nAnalyze the error, explain the root cause clearly, and provide clean, robust code with comments.`;
  }

  return base;
}
