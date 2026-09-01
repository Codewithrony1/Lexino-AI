import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/account(.*)']);
const isAdminRoute = createRouteMatcher(['/lexino-owner-panel-x7a91(.*)']);

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.lexinoai.in https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.lexinoai.in https://clerk-telemetry.com https://*.accounts.dev https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com",
];

const cspHeader = cspDirectives.join('; ');

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('Content-Security-Policy', cspHeader);
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")');
  return res;
}

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
        const redirectRes = NextResponse.redirect(new URL('/', req.url));
        return applySecurityHeaders(redirectRes);
      }
    } catch (err) {
      console.error('Error verifying admin role in middleware:', err);
      const redirectRes = NextResponse.redirect(new URL('/', req.url));
      return applySecurityHeaders(redirectRes);
    }
  } else if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
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
