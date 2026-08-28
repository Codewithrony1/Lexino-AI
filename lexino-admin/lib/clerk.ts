import { createClerkClient } from '@clerk/backend';

let clerkInstance: ReturnType<typeof createClerkClient> | null = null;

export function getClerkServerClient() {
  const secretKey = (process.env.CLERK_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured in server environment variables.');
  }

  if (!clerkInstance) {
    clerkInstance = createClerkClient({ secretKey });
  }

  return clerkInstance;
}
