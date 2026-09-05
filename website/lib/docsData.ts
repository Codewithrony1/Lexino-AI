export interface DocArticle {
  slug: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  prev?: { title: string; href: string };
  next?: { title: string; href: string };
  content: {
    lead: string;
    sections: {
      heading: string;
      body: string[];
      code?: {
        language: string;
        code: string;
      };
      callout?: {
        type: 'info' | 'tip' | 'warning';
        text: string;
      };
      table?: {
        headers: string[];
        rows: string[][];
      };
    }[];
  };
}

export interface DocCategory {
  title: string;
  icon: string;
  items: { title: string; slug: string }[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { title: 'Introduction', slug: 'getting-started' },
      { title: 'Quick Start', slug: 'quickstart' },
    ],
  },
  {
    title: 'LexinoAI Workspace',
    icon: '💬',
    items: [
      { title: 'Chat Assistant', slug: 'chat' },
      { title: 'Projects & Vaults', slug: 'projects' },
      { title: 'Files & RAG Engine', slug: 'files' },
      { title: 'Features & Wallpapers', slug: 'features' },
    ],
  },
  {
    title: 'Account & Identity',
    icon: '🔐',
    items: [
      { title: 'Authentication & SSO', slug: 'authentication' },
      { title: 'Subscription Plans', slug: 'subscriptions' },
    ],
  },
  {
    title: 'Developer Platform',
    icon: '⚡',
    items: [
      { title: 'Chat Completions API', slug: 'api' },
      { title: 'Binary Cold Storage', slug: 'compression' },
    ],
  },
  {
    title: 'Security & Trust',
    icon: '🛡️',
    items: [
      { title: 'Privacy & Data Security', slug: 'security' },
    ],
  },
  {
    title: 'Reference',
    icon: '❓',
    items: [
      { title: 'Frequently Asked Questions', slug: 'faq' },
    ],
  },
];

export const DOC_ARTICLES: Record<string, DocArticle> = {
  'getting-started': {
    slug: 'getting-started',
    category: 'Getting Started',
    title: 'Introduction to Lexino AI',
    description: 'Welcome to Lexino AI — the fastest AI thinking partner designed for study, exam preparation, coding, and real-time knowledge synthesis.',
    readTime: '3 min read',
    next: { title: 'Quick Start Guide', href: '/docs/quickstart' },
    content: {
      lead: 'Lexino AI is a multi-model conversational intelligence platform built from the ground up for lightning-fast reasoning, competitive exam preparation, technical interview mastery, and automated study workflows.',
      sections: [
        {
          heading: 'Core Platform Architecture',
          body: [
            'Lexino AI runs across a distributed edge architecture organized into dedicated product surfaces under the Lexino AI brand:',
            '• Main Portal (www.lexinoai.in): Marketing, feature overviews, student pricing, and plan subscriptions.',
            '• AI Workspace (chat.lexinoai.in): Dedicated chat client, project workspaces, document RAG vault, and API endpoints.',
            '• Central Auth (accounts.lexinoai.in): Centralized authentication service powered by Clerk with Google SSO and shared session cookies.',
            '• Public Docs (docs.lexinoai.in): Public documentation accessible to anyone without requiring an account.',
          ],
          callout: {
            type: 'info',
            text: 'All surfaces share a single session cookie across *.lexinoai.in, allowing seamless navigation without needing to re-login.',
          },
        },
        {
          heading: 'Key Capabilities',
          body: [
            '• Ultra-Fast Streaming: Real-time Server-Sent Events (SSE) token streaming delivering sub-second response start times.',
            '• Multi-Model Reasoning: Seamless switching between Groq-accelerated open-weights models, ChatGPT (GPT-4o), and Anthropic Claude 3.5 Sonnet.',
            '• Exam & Study Grounding: Step-by-step concept explanations, mock question generation, and formula derivations for UPSC, JEE, NEET, and GATE.',
            '• Code Execution & DSA Practice: Live syntax highlighting, algorithmic debugging, and interactive code explanation across Python, C++, Java, and TypeScript.',
          ],
        },
      ],
    },
  },

  'quickstart': {
    slug: 'quickstart',
    category: 'Getting Started',
    title: 'Quick Start Guide',
    description: 'Get started with Lexino AI in under two minutes: create your account, configure your workspace, and launch your first AI conversation.',
    readTime: '2 min read',
    prev: { title: 'Introduction', href: '/docs/getting-started' },
    next: { title: 'Chat Assistant', href: '/docs/chat' },
    content: {
      lead: 'This guide walks you through setting up your Lexino AI account and launching your first conversational thinking session.',
      sections: [
        {
          heading: 'Step 1: Sign in with Google or Email',
          body: [
            'Visit accounts.lexinoai.in/login or click "Experience Lexino AI Now" from the main website. You can sign in instantly using Google Single Sign-On (SSO) or create an account with email and password.',
            'Upon successful authentication, you are automatically redirected into the AI workspace at chat.lexinoai.in.',
          ],
        },
        {
          heading: 'Step 2: Choose Your AI Model',
          body: [
            'In the chat header, you can select your desired intelligence core:',
            '• Default (High-Speed): Ultra-low latency model powered by Groq LPU inference, ideal for rapid queries, concept lookups, and brainstorming.',
            '• ChatGPT (GPT-4o): Deep reasoning model for structured essays, multi-step problem solving, and complex logic (Student & Pro plans).',
            '• Claude 3.5 Sonnet: Advanced nuance, creative writing, and production code architecture (Pro plan).',
          ],
        },
        {
          heading: 'Step 3: Organize with Projects and Files',
          body: [
            'Create dedicated study vaults under /projects and upload reference notes or syllabus PDFs in /files to ground the AI in your specific course materials.',
          ],
        },
      ],
    },
  },

  'chat': {
    slug: 'chat',
    category: 'LexinoAI Workspace',
    title: 'Chat Assistant & Reasoning Core',
    description: 'Explore the high-performance chat interface: SSE streaming, markdown formatting, LaTeX math formulas, and code block execution.',
    readTime: '4 min read',
    prev: { title: 'Quick Start Guide', href: '/docs/quickstart' },
    next: { title: 'Projects & Vaults', href: '/docs/projects' },
    content: {
      lead: 'The Lexino AI Chat interface is engineered for zero-distraction focus, glassmorphism aesthetics, and ultra-low latency response generation.',
      sections: [
        {
          heading: 'Server-Sent Events (SSE) Streaming',
          body: [
            'Lexino AI streams tokens incrementally as they are synthesized by the inference engine. This gives immediate feedback and avoids waiting for lengthy responses to finish before reading.',
            'If a network disconnect occurs mid-generation, the client handles reconnection transparently.',
          ],
        },
        {
          heading: 'Rich Content Rendering',
          body: [
            '• Markdown & Headings: Automatic structure with clear visual hierarchy.',
            '• Code Highlighting: Multi-language syntax highlighting with 1-click code copying.',
            '• LaTeX & Math Equations: Seamless mathematical notation for physics, chemistry, and calculus formulas.',
            '• Tables & Bullet Lists: Formatted summaries and comparative analyses.',
          ],
        },
        {
          heading: 'Conversation History & Session Sync',
          body: [
            'Every chat conversation is automatically persisted into your personal Neon PostgreSQL database record. You can rename threads, delete previous chats, or resume past sessions from the sidebar at any time.',
          ],
        },
      ],
    },
  },

  'projects': {
    slug: 'projects',
    category: 'LexinoAI Workspace',
    title: 'Projects & Knowledge Vaults',
    description: 'Learn how to organize your exam prep subjects, coding roadmaps, and research notes into dedicated project vaults.',
    readTime: '3 min read',
    prev: { title: 'Chat Assistant', href: '/docs/chat' },
    next: { title: 'Files & RAG Engine', href: '/docs/files' },
    content: {
      lead: 'Projects allow you to cluster conversations, system prompts, and reference documents into topic-focused silos.',
      sections: [
        {
          heading: 'Why Use Projects?',
          body: [
            'When preparing for complex goals like competitive examinations or technical job interviews, mixing all conversations into one stream causes context pollution.',
            'Projects isolate conversation memory so your JEE Physics queries do not intermingle with DSA LeetCode solutions or history revision notes.',
          ],
        },
        {
          heading: 'Managing Workspaces',
          body: [
            'Access your projects anytime from https://chat.lexinoai.in/projects. Each project card summarizes active chat counts, indexed notes, and last modified timestamps.',
          ],
        },
      ],
    },
  },

  'files': {
    slug: 'files',
    category: 'LexinoAI Workspace',
    title: 'Files & Document RAG Vault',
    description: 'Upload textbooks, lecture notes, formula sheets, and source code files to ground Lexino AI in your custom documents.',
    readTime: '3 min read',
    prev: { title: 'Projects & Vaults', href: '/docs/projects' },
    next: { title: 'Features & Wallpapers', href: '/docs/features' },
    content: {
      lead: 'Lexino AI allows uploading documents directly into your private knowledge vault for retrieval-augmented generation (RAG).',
      sections: [
        {
          heading: 'Supported File Types',
          body: [
            '• PDF Documents: Lecture slides, NCERT textbooks, research papers, and previous year question papers.',
            '• Text & Markdown: Notes, study outlines, and documentation (.txt, .md).',
            '• Code Files: Python (.py), C++ (.cpp), Java (.java), TypeScript (.ts), and JavaScript (.js).',
          ],
        },
        {
          heading: 'Document Grounding',
          body: [
            'Uploaded documents are parsed server-side and made available to your chat sessions. When you ask a question referencing a file, Lexino AI prioritizes exact citations from your uploaded materials before general web knowledge.',
          ],
        },
      ],
    },
  },

  'features': {
    slug: 'features',
    category: 'LexinoAI Workspace',
    title: '3D Cosmic Wallpapers & Customization',
    description: 'Transform your AI interface with GPU-accelerated 3D animated cosmic backgrounds and theme accents.',
    readTime: '2 min read',
    prev: { title: 'Files & RAG Engine', href: '/docs/files' },
    next: { title: 'Authentication & SSO', href: '/docs/authentication' },
    content: {
      lead: 'Lexino AI incorporates interactive visual environments that make long study sessions engaging and visually calming.',
      sections: [
        {
          heading: 'Available Themes',
          body: [
            '• Deep Aurora: Smooth, shifting northern light ribbons in emerald and indigo.',
            '• Neon Matrix: High-tech cyberpunk grid with dynamic light particles.',
            '• Smoky Universe: Deep cosmic nebulae with slow orbital camera movement.',
            '• Minimal Dark: Clean, distraction-free obsidian background optimized for battery life.',
          ],
          callout: {
            type: 'tip',
            text: 'Wallpapers use CSS and Three.js hardware acceleration with automatic frame-rate throttling when the tab is backgrounded to preserve device battery.',
          },
        },
      ],
    },
  },

  'authentication': {
    slug: 'authentication',
    category: 'Account & Identity',
    title: 'Centralized Authentication Architecture',
    description: 'Understand how accounts.lexinoai.in centralizes identity across all Lexino AI subdomains using Clerk.',
    readTime: '4 min read',
    prev: { title: 'Features & Wallpapers', href: '/docs/features' },
    next: { title: 'Subscription Plans', href: '/docs/subscriptions' },
    content: {
      lead: 'Lexino AI delegates authentication to accounts.lexinoai.in, providing enterprise-grade security and cross-subdomain single sign-on.',
      sections: [
        {
          heading: 'Central Identity Service (accounts.lexinoai.in)',
          body: [
            'Rather than duplicating authentication logic across multiple domains, accounts.lexinoai.in acts as the single source of truth for identity.',
            '• When an unauthenticated visitor requests a protected workspace surface (e.g. chat.lexinoai.in), the edge middleware seamlessly redirects them to accounts.lexinoai.in/login with a cryptographic redirect_url parameter.',
            '• Upon successful login via Google SSO or email, Clerk writes the session token (__session) scoped to .lexinoai.in.',
            '• The user is then returned to the exact page they requested with their session already active.',
          ],
        },
        {
          heading: 'Session Security & Token Scope',
          body: [
            '• Apex Scoping: Session cookies are set with Domain=.lexinoai.in, Secure, HttpOnly, and SameSite=Lax.',
            '• Zero Secret Exposure: Client browsers never receive backend API keys or database connection strings.',
            '• Cross-Site Protection: Strict Content Security Policy (CSP) and Cross-Origin-Opener-Policy headers prevent clickjacking and session spoofing.',
          ],
        },
      ],
    },
  },

  'subscriptions': {
    slug: 'subscriptions',
    category: 'Account & Identity',
    title: 'Subscriptions & Query Quotas',
    description: 'Overview of the Explorer Free Tier, Student Preparation Monthly Plan, and Pro Access Tier.',
    readTime: '3 min read',
    prev: { title: 'Authentication & SSO', href: '/docs/authentication' },
    next: { title: 'Chat Completions API', href: '/docs/api' },
    content: {
      lead: 'Lexino AI provides tiered access designed to keep high-powered AI accessible for students while offering high compute quotas for power users.',
      sections: [
        {
          heading: 'Plan Comparison',
          body: [
            'All plans include access to the core chat interface, responsive design, and personal workspace history.',
          ],
          table: {
            headers: ['Feature', 'Explorer (Free)', 'Student (₹49/mo)', 'Pro (₹299/mo)'],
            rows: [
              ['Daily Query Limit', '50 queries/day', '300 queries/day', '1,500 queries/day'],
              ['Groq Ultra-Fast Core', 'Included', 'Included', 'Included'],
              ['ChatGPT (GPT-4o)', 'No', 'Included', 'Included'],
              ['Claude 3.5 Sonnet', 'No', 'No', 'Included'],
              ['3D Space Wallpapers', '6 Wallpapers', 'All 13 Wallpapers', 'All 13 + Custom'],
              ['Customer Support', 'Community', 'Standard', 'Priority 24/7'],
            ],
          },
        },
        {
          heading: 'Student Verification',
          body: [
            'The Student Plan is subsidized at ₹49/month for enrolled students. During checkout on www.lexinoai.in/pricing, enter your Institute Name, Course/Branch, and Roll ID to activate student pricing.',
          ],
        },
      ],
    },
  },

  'api': {
    slug: 'api',
    category: 'Developer Platform',
    title: 'Chat Completions API Reference',
    description: 'Integrate Lexino AI into your applications, terminal scripts, or study bots via the versioned REST API.',
    readTime: '4 min read',
    prev: { title: 'Subscription Plans', href: '/docs/subscriptions' },
    next: { title: 'Binary Cold Storage', href: '/docs/compression' },
    content: {
      lead: 'Lexino AI provides a developer-friendly HTTP API endpoint hosted on chat.lexinoai.in for programmatic message synthesis.',
      sections: [
        {
          heading: 'Endpoint URL',
          body: [
            'The primary endpoint for conversational inference is:',
            'POST https://chat.lexinoai.in/api/v1/chat (or /api/chat)',
          ],
        },
        {
          heading: 'Request Format',
          body: [
            'Send a JSON payload with your message content and optional model selector:',
          ],
          code: {
            language: 'bash',
            code: `curl -X POST https://chat.lexinoai.in/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Explain binary search tree balancing algorithms in C++",
    "selectedModel": "default"
  }'`,
          },
        },
        {
          heading: 'JavaScript / TypeScript Client Example',
          body: [
            'Consume the streaming response in Node.js or the browser:',
          ],
          code: {
            language: 'typescript',
            code: `async function generateAnswer(prompt: string) {
  const response = await fetch('https://chat.lexinoai.in/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: prompt, selectedModel: 'default' }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value));
  }
}`,
          },
        },
      ],
    },
  },

  'compression': {
    slug: 'compression',
    category: 'Developer Platform',
    title: 'Binary Cold Storage Engine',
    description: 'How Lexino AI achieves 70%–85% database storage reduction using native Brotli and Gzip compression.',
    readTime: '3 min read',
    prev: { title: 'Chat Completions API', href: '/docs/api' },
    next: { title: 'Privacy & Data Security', href: '/docs/security' },
    content: {
      lead: 'To scale database capacity while preserving full chat history, Lexino AI implements automated binary cold storage.',
      sections: [
        {
          heading: 'How It Works',
          body: [
            '• Inactive sessions (older than 7 days) are compressed using Node.js native zlib Brotli (Quality level 6).',
            '• The resulting binary payload is stored as a compressed buffer in PostgreSQL, reducing row footprint by up to 85%.',
            '• Transparent Decompression: When a user re-opens an archived session, the engine auto-detects binary headers, uncompresses the message history into memory in under 2ms, and restores the chat seamlessly.',
          ],
        },
        {
          heading: 'Archiving Endpoints',
          body: [
            '• POST /api/chat/archive: Compresses inactive sessions.',
            '• GET /api/chat/sessions: Returns all chat sessions with automatic transparent decompression.',
          ],
        },
      ],
    },
  },

  'security': {
    slug: 'security',
    category: 'Security & Trust',
    title: 'Privacy & Platform Security',
    description: 'Discover the security protocols protecting your data: HSTS Preload, Strict CSP, and Role-Gated Admin Controls.',
    readTime: '3 min read',
    prev: { title: 'Binary Cold Storage', href: '/docs/compression' },
    next: { title: 'Frequently Asked Questions', href: '/docs/faq' },
    content: {
      lead: 'Lexino AI is architected with a security-first stance to ensure student and user data remains private and protected.',
      sections: [
        {
          heading: 'Security Headers & Hardening',
          body: [
            '• Strict-Transport-Security (HSTS): max-age=63072000; includeSubDomains; preload enforces end-to-end HTTPS across all subdomains.',
            '• Content-Security-Policy (CSP): Zero unsafe-eval in production. Explicit trusted allowlists for Clerk and Razorpay.',
            '• Process Isolation: Cross-Origin-Opener-Policy (same-origin-allow-popups) and Cross-Origin-Resource-Policy (same-site) protect against Spectre and cross-origin data leaks.',
            '• X-Frame-Options: SAMEORIGIN defends against clickjacking and UI redress attacks.',
          ],
        },
        {
          heading: 'Role-Gated Admin Console',
          body: [
            'The internal operations console (/console/*) is gated behind strict server-side Clerk role verification. Unauthenticated or non-owner requests receive a strict HTTP 404 (Not Found) with noindex headers, completely concealing internal consoles from search crawlers and unauthorized visitors.',
          ],
        },
      ],
    },
  },

  'faq': {
    slug: 'faq',
    category: 'Reference',
    title: 'Frequently Asked Questions',
    description: 'Answers to the most commonly asked questions about Lexino AI accounts, pricing, and AI models.',
    readTime: '4 min read',
    prev: { title: 'Privacy & Platform Security', href: '/docs/security' },
    content: {
      lead: 'Find answers to common questions about using Lexino AI for studying, exams, and development.',
      sections: [
        {
          heading: 'Is Lexino AI free to use?',
          body: [
            'Yes! The Explorer Free Tier gives you 50 daily queries with ultra-fast responses and 6 cosmic themes completely free.',
          ],
        },
        {
          heading: 'How do I access the Student Plan for ₹49/month?',
          body: [
            'Go to https://www.lexinoai.in/pricing, click "Get Student Plan", enter your institute, course, and roll number, and complete the Razorpay checkout. Your account will immediately upgrade to 300 queries/day with ChatGPT access.',
          ],
        },
        {
          heading: 'Can I access Lexino AI on mobile devices?',
          body: [
            'Absolutely. Lexino AI is fully responsive on all mobile browsers (iOS Safari, Android Chrome). You can also add it to your home screen as a web app for a native app feel.',
          ],
        },
        {
          heading: 'How do I access the documentation?',
          body: [
            'Documentation is hosted at https://docs.lexinoai.in and is completely open to the public without requiring any sign-in.',
          ],
        },
      ],
    },
  },
};
