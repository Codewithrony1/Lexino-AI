# Lexino.ai

Lexino.ai is a premium AI chat interface with a futuristic dark UI, persistent chat history, multi-modal input support, dynamic wallpapers, and protected authentication.

## Features

- Persistent local chat history grouped by time.
- Search, pinned chats, sharing, and temporary chat mode.
- Markdown rendering for AI responses.
- File attachments and voice input.
- Dynamic Lexino wallpapers and profile customization.
- Clerk authentication with protected chat access.

## Authentication

Lexino AI uses Next.js App Router with Clerk authentication.

Routes:
- `/` - Landing page
- `/sign-in` - Clerk sign in
- `/sign-up` - Clerk sign up
- `/chat` - Protected Lexino AI chat

Create `.env.local` from `.env.example` and add:

```bash
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

In Clerk Dashboard, enable Email/Password, Google, and GitHub providers. Add redirect URLs for local and production:

```text
http://localhost:3000/sign-in
http://localhost:3000/sign-up
http://localhost:3000/chat
https://lexinoai.vercel.app/sign-in
https://lexinoai.vercel.app/sign-up
https://lexinoai.vercel.app/chat
```

## Technical Overview

The project uses Next.js for routing and route protection while preserving the existing vanilla chat UI for the authenticated `/chat` interface. Local chat state currently remains client-side, with the structure prepared for future Supabase-backed saved chats, pinned chats, user history, cloud sync, and premium plans.

- `app/` - Next.js routes, Clerk auth pages, protected chat route, and API route.
- `script.js` - Existing chat UI state, event handling, sessions, and user preferences.
- `style.css` - Existing Lexino chat visual system.
- `api.js` - Browser API client for `/api/chat`.
- `app/api/chat/route.ts` - Protected server-side LLM endpoint.

## Installation & Usage

1. Clone the repository.

2. Install dependencies:

```bash
npm install
```

3. Configure `.env.local` using `.env.example`.

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/sign-in`.

## Deployment

Deploy on Vercel and set these environment variables:

```bash
GROQ_API_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat
```

## License

[Add License Information Here]
