export interface PlanConfig {
  id: 'explorer' | 'student' | 'pro';
  name: string;
  badge: string;
  tier: 'FREE' | 'STUDENT' | 'PRO';
  priceInr: number;
  amountInPaise: number;
  originalPriceInr: number;
  period: string;
  queriesPerDay: number;
  requiresStudentId?: boolean;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    badge: 'FREE',
    tier: 'FREE',
    priceInr: 0,
    amountInPaise: 0,
    originalPriceInr: 199,
    period: '/month',
    queriesPerDay: 50,
    features: [
      '50 queries per day',
      'Basic text generation',
      'Standard response speed',
      '6 smooth celestial wallpapers',
      'Access to core features',
    ],
  },
  student: {
    id: 'student',
    name: 'Student',
    badge: 'STUDENT',
    tier: 'STUDENT',
    priceInr: 49,
    amountInPaise: 4900, // ₹49.00
    originalPriceInr: 499,
    period: '/month',
    queriesPerDay: 300,
    requiresStudentId: true,
    features: [
      '300 queries per day',
      'ChatGPT (GPT-4o) access included',
      'Ideal for exam prep (UPSC, JEE, NEET, GATE)',
      'Advanced text generation',
      'Priority response speed',
      'Unlock all 13 premium space & 3D wallpapers',
      'Code generation support',
      'Save conversations',
      'Valid student ID required',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'BEST VALUE',
    tier: 'PRO',
    priceInr: 299,
    amountInPaise: 29900, // ₹299.00
    originalPriceInr: 999,
    period: '/month',
    queriesPerDay: 1500,
    features: [
      '1500 queries per day',
      'Both ChatGPT & Claude Sonnet included',
      'Priority response speed',
      'Code generation & debugging',
      'Voice & chat integration',
      'Unlimited premium & 3D wallpapers',
      'Deep personalization & workspaces',
      'Priority support',
    ],
  },
};
