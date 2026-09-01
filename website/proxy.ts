import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicMarketingRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/help',
  '/terms',
  '/privacy',
  '/docs(.*)',
  '/login(.*)',
  '/signup(.*)',
  '/api/razorpay/webhook(.*)',
  '/api/razorpay-webhook(.*)',
]);

const isConsoleRoute = createRouteMatcher(['/console(.*)', '/lexino-owner-panel-x7a91(.*)']);
const isApiRoute = createRouteMatcher(['/api/(.*)', '/api/v1/(.*)']);
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/account(.*)',
  '/settings(.*)',
  '/projects(.*)',
  '/files(.*)',
]);

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.lexinoai.in https://va.vercel-scripts.com",
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

function applySecurityHeaders(res: NextResponse, reqId: string) {
  res.headers.set('Content-Security-Policy', cspHeader);
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  res.headers.set('x-request-id', reqId);
  return res;
}

export default clerkMiddleware(async (auth, req) => {
  const reqId = req.headers.get('x-request-id') || crypto.randomUUID();
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const authObj = await auth();

  // 1. Docs Subdomain (Publicly Accessible)
  if (hostname.startsWith('docs.') && url.pathname === '/') {
    const rewriteRes = NextResponse.rewrite(new URL('/docs', req.url));
    return applySecurityHeaders(rewriteRes, reqId);
  }

  // 2. Accounts Subdomain (Public Auth Entrypoint)
  if (hostname.startsWith('accounts.') && url.pathname === '/') {
    const rewriteRes = NextResponse.rewrite(new URL('/login', req.url));
    return applySecurityHeaders(rewriteRes, reqId);
  }

  // 3. Chat Subdomain: Enforce Strict Authentication on all chat domain routes
  if (hostname.startsWith('chat.')) {
    if (!authObj.userId) {
      await auth.protect();
      return;
    }
    if (url.pathname === '/') {
      const rewriteRes = NextResponse.rewrite(new URL('/chat', req.url));
      return applySecurityHeaders(rewriteRes, reqId);
    }
  }

  // 4. Role-Gated Admin Console (/console/*): Strict 404 for unauthenticated or non-owners
  if (isConsoleRoute(req)) {
    if (!authObj.userId) {
      const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
      notFoundRes.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      notFoundRes.headers.set('Cache-Control', 'no-store, max-age=0');
      return applySecurityHeaders(notFoundRes, reqId);
    }

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(authObj.userId);
      const role = user.publicMetadata?.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
        notFoundRes.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        notFoundRes.headers.set('Cache-Control', 'no-store, max-age=0');
        return applySecurityHeaders(notFoundRes, reqId);
      }
    } catch (err) {
      console.error('Error verifying admin role in middleware:', err);
      const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
      notFoundRes.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      notFoundRes.headers.set('Cache-Control', 'no-store, max-age=0');
      return applySecurityHeaders(notFoundRes, reqId);
    }
  } else if (isProtectedRoute(req)) {
    // Protected workspace routes: require login
    if (!authObj.userId) {
      await auth.protect();
      return;
    }
  }

  const response = NextResponse.next();

  // 5. Exclude API and Console routes from edge caching and search indexers
  if (isApiRoute(req) || isConsoleRoute(req)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return applySecurityHeaders(response, reqId);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
