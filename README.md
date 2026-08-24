# Lexino AI — Architecture & Workspace Guide

Lexino AI is a next-generation AI operating system, academic strategist, and intelligent thinking partner.

---

## 📁 Repository Structure

```text
Lexino-AI/
├── website/                    # Primary Next.js Application & Serverless API
│   ├── app/
│   │   ├── (frontend)/         # Marketing & Public Routes (/, /pricing, /help, /terms, /privacy)
│   │   ├── (auth)/             # Authentication Routes (/login, /signup)
│   │   ├── (app)/              # Authenticated App Routes (/chat, /account, /settings)
│   │   ├── (admin)/            # Admin Panel & Decoys (/lexino-owner-panel-x7a91, /admin)
│   │   ├── api/                # API Endpoints (/api/chat, /api/admin/*, /api/razorpay/*, etc.)
│   │   ├── globals.css         # Global Styles & Theming Tokens
│   │   ├── layout.tsx          # Root Layout & Clerk Provider
│   │   ├── not-found.tsx       # Custom 404
│   │   ├── robots.ts           # SEO Robots Configuration
│   │   └── sitemap.ts          # SEO Dynamic Sitemap
│   │
│   ├── components/             # Modular, Feature-Oriented Components
│   │   ├── account/            # Account & profile components
│   │   ├── admin/              # Admin dashboard components
│   │   ├── auth/               # Authentication shells & auth cards
│   │   ├── chat/               # Chat workspace, overlays & user mount
│   │   ├── frontend/           # Marketing page components
│   │   ├── navigation/         # Headers, footers & navigation controls
│   │   ├── shared/             # Reusable loaders, scripts & helpers
│   │   ├── ui/                 # Core UI elements (buttons, inputs, cards)
│   │   └── wallpapers/         # 3D and celestial animated wallpapers
│   │
│   ├── lib/                    # Reusable Clients, Helpers & Utilities
│   │   ├── adminAuth.ts        # Admin HMAC signature verification & role check
│   │   ├── clerkAppearance.ts  # Clerk theme & modal branding customization
│   │   ├── plans.ts            # Subscription tier definitions & quotas
│   │   ├── prisma.ts           # Global Prisma ORM client
│   │   ├── razorpay.ts         # Payment gateway verification & order creator
│   │   └── staticLandingHtml.ts # Synchronized landing template
│   │
│   ├── services/               # LLM & AI Provider Clients (Groq, HF, OpenAI, Claude)
│   ├── styles/                 # Modular CSS stylesheets (admin, animations, themes)
│   ├── scripts/                # Build hooks (sync-templates.cjs)
│   ├── prisma/                 # Prisma database schema (schema.prisma)
│   ├── public/                 # Static assets, PWA manifest, and service worker (sw.js)
│   ├── Lexino Website/         # Source marketing templates & assets
│   ├── proxy.ts                # Clerk middleware proxy
│   ├── next.config.mjs         # Next.js production configuration
│   └── package.json            # Scripts & dependencies
│
├── backend/                    # Standalone backend services workspace
├── desktop-assets/             # Offline / desktop fallback assets
├── src-tauri/                  # Cross-platform desktop shell (Tauri + Rust)
├── README.md                   # Workspace documentation
├── .gitignore
└── .gitattributes
```

---

## 🚀 Getting Started

### Running the Web Application

1. Navigate to the `website` directory:
   ```bash
   cd website
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

### Running Desktop App (Tauri)

From the project root:
```bash
npm --prefix website run tauri dev
```
