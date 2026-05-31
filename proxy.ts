import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/account(.*)']);
const isAdminRoute = createRouteMatcher(['/lexino-owner-panel-x7a91(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth();
  
  if (isAdminRoute(req)) {
    if (!authObj.userId) {
      // Force sign-in
      await auth.protect();
      return;
    }
    
    // Server-side OWNER role check
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(authObj.userId);
      const role = user.publicMetadata?.role;
      if (role !== 'OWNER') {
        // Redirect unauthorized to home
        return NextResponse.redirect(new URL('/', req.url));
      }
    } catch (err) {
      console.error('Error verifying admin role in middleware:', err);
      return NextResponse.redirect(new URL('/', req.url));
    }
  } else if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Route Clerk authentication helpers
    '/__clerk/(.*)',
  ],
};
