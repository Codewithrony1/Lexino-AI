import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.lexinoai.in https://*.lexinoai.in https://lexinoai.in https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.lexinoai.in https://*.lexinoai.in https://lexinoai.in https://clerk-telemetry.com https://*.accounts.dev https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://accounts.google.com https://*.lexinoai.in https://lexinoai.in",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://*.lexinoai.in https://lexinoai.in",
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
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.hostname;
  const host = rawHost.split(':')[0].toLowerCase();
  const isLexinoDomain = host === 'lexinoai.in' || host.endsWith('.lexinoai.in');

  // =========================================================================
  // 0. CROSS-SUBDOMAIN SESSION SYNC HANDLER
  // If __session token is passed in query, set cookie on .lexinoai.in and redirect
  // =========================================================================
  const querySession = url.searchParams.get('__session');
  if (querySession && isLexinoDomain) {
    url.searchParams.delete('__session');
    const cleanPath = (url.pathname || '/') + (url.search ? url.search : '');
    const redirectRes = NextResponse.redirect(new URL(cleanPath, req.url), 307);
    redirectRes.cookies.set('__session', querySession, {
      domain: '.lexinoai.in',
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: false,
    });
    return applySecurityHeaders(redirectRes, reqId);
  }

  // =========================================================================
  // 1. APEX DOMAIN: lexinoai.in -> 308 Permanent Redirect to www.lexinoai.in
  // =========================================================================
  if (host === 'lexinoai.in') {
    const destination = new URL(url.pathname + url.search, 'https://www.lexinoai.in');
    return NextResponse.redirect(destination, 308);
  }

  // =========================================================================
  // 2. DOCUMENTATION WEBSITE: docs.lexinoai.in (Public - Zero Login Required)
  // =========================================================================
  if (host === 'docs.lexinoai.in') {
    // Cross-surface redirects
    if (url.pathname.startsWith('/chat') || url.pathname.startsWith('/projects') || url.pathname.startsWith('/files')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://chat.lexinoai.in'), 307);
    }
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://accounts.lexinoai.in'), 307);
    }

    // Root '/' on docs domain -> rewrites to '/docs'
    if (url.pathname === '/') {
      const rewriteRes = NextResponse.rewrite(new URL('/docs', req.url));
      return applySecurityHeaders(rewriteRes, reqId);
    }

    const docSlugs = [
      'getting-started',
      'quickstart',
      'chat',
      'projects',
      'files',
      'features',
      'authentication',
      'subscriptions',
      'api',
      'compression',
      'security',
      'faq',
    ];
    const cleanPath = url.pathname.replace(/^\/+/, '');
    if (docSlugs.includes(cleanPath)) {
      const rewriteRes = NextResponse.rewrite(new URL(`/docs/${cleanPath}`, req.url));
      return applySecurityHeaders(rewriteRes, reqId);
    }

    const response = NextResponse.next();
    return applySecurityHeaders(response, reqId);
  }

  // =========================================================================
  // 3. AUTHENTICATION SERVICE: accounts.lexinoai.in (Central Auth)
  // =========================================================================
  const authObj = await auth();

  if (host === 'accounts.lexinoai.in') {
    // Root '/' on accounts domain:
    if (url.pathname === '/') {
      if (authObj.userId) {
        const rewriteRes = NextResponse.rewrite(new URL('/account', req.url));
        return applySecurityHeaders(rewriteRes, reqId);
      } else {
        const rewriteRes = NextResponse.rewrite(new URL('/login', req.url));
        return applySecurityHeaders(rewriteRes, reqId);
      }
    }

    // If marketing paths requested on accounts domain -> redirect to www.lexinoai.in
    if (url.pathname === '/pricing' || url.pathname === '/help' || url.pathname === '/terms' || url.pathname === '/privacy') {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://www.lexinoai.in'), 307);
    }

    // If workspace paths requested on accounts domain -> redirect to chat.lexinoai.in
    if (url.pathname.startsWith('/chat') || url.pathname.startsWith('/projects') || url.pathname.startsWith('/files')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://chat.lexinoai.in'), 307);
    }

    // If docs requested on accounts domain -> redirect to docs.lexinoai.in
    if (url.pathname.startsWith('/docs')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://docs.lexinoai.in'), 307);
    }

    // Active session redirect for /login and /signup with cross-subdomain cookie reinforcement
    if ((url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) && authObj.userId) {
      const rawRedirect = url.searchParams.get('redirect_url') || url.searchParams.get('redirectUrl');
      const safeDest = rawRedirect && !rawRedirect.includes('/login') && !rawRedirect.includes('/signup')
        ? rawRedirect
        : 'https://chat.lexinoai.in';
      
      let targetUrl: URL;
      try {
        targetUrl = new URL(safeDest, 'https://chat.lexinoai.in');
      } catch {
        targetUrl = new URL('https://chat.lexinoai.in');
      }
      const sessionToken = req.cookies.get('__session')?.value;
      if (sessionToken && isLexinoDomain) {
        targetUrl.searchParams.set('__session', sessionToken);
      }
      
      const redirectRes = NextResponse.redirect(targetUrl, 307);
      if (sessionToken && isLexinoDomain) {
        redirectRes.cookies.set('__session', sessionToken, {
          domain: '.lexinoai.in',
          path: '/',
          sameSite: 'lax',
          secure: true,
          httpOnly: false,
        });
      }
      return applySecurityHeaders(redirectRes, reqId);
    }

    // Auth endpoints (/login, /signup, /sso-callback, /account, /__clerk, /api/auth) serve directly
    const response = NextResponse.next();
    const sessionCookie = req.cookies.get('__session')?.value;
    if (sessionCookie && isLexinoDomain) {
      response.cookies.set('__session', sessionCookie, {
        domain: '.lexinoai.in',
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: false,
      });
    }
    return applySecurityHeaders(response, reqId);
  }

  // =========================================================================
  // 4. CHAT WEBSITE: chat.lexinoai.in (Dedicated AI Chat & Workspace)
  // =========================================================================
  if (host === 'chat.lexinoai.in') {
    // If login or signup directly requested on chat domain -> redirect to accounts.lexinoai.in
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
      const targetReturn = 'https://chat.lexinoai.in';
      return NextResponse.redirect(new URL(`https://accounts.lexinoai.in${url.pathname}?redirect_url=${encodeURIComponent(targetReturn)}`), 307);
    }

    // If marketing paths requested on chat domain -> redirect to www.lexinoai.in
    if (url.pathname === '/pricing' || url.pathname === '/help' || url.pathname === '/terms' || url.pathname === '/privacy') {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://www.lexinoai.in'), 307);
    }

    // If docs requested on chat domain -> redirect to docs.lexinoai.in
    if (url.pathname.startsWith('/docs')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://docs.lexinoai.in'), 307);
    }

    // Role-gated admin console (/console/*): Strict 404 for unauthorized visitors
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
    }

    // Enforce authentication on chat workspace routes
    const isWorkspacePath = url.pathname === '/' || isProtectedRoute(req);
    if (isWorkspacePath) {
      if (!authObj.userId) {
        const targetReturn = 'https://chat.lexinoai.in' + (url.pathname === '/' ? '' : url.pathname) + url.search;
        const loginUrl = new URL(`https://accounts.lexinoai.in/login?redirect_url=${encodeURIComponent(targetReturn)}`);
        return NextResponse.redirect(loginUrl, 307);
      }

      // When authenticated on root '/' of chat domain -> rewrite to '/chat'
      if (url.pathname === '/') {
        const rewriteRes = NextResponse.rewrite(new URL('/chat', req.url));
        return applySecurityHeaders(rewriteRes, reqId);
      }
    }

    const response = NextResponse.next();
    if (isApiRoute(req) || isConsoleRoute(req)) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    return applySecurityHeaders(response, reqId);
  }

  // =========================================================================
  // 5. MAIN WEBSITE: www.lexinoai.in
  // =========================================================================
  if (host === 'www.lexinoai.in') {
    // If docs requested on www -> redirect to docs.lexinoai.in
    if (url.pathname.startsWith('/docs')) {
      const subpath = url.pathname.replace(/^\/docs/, '');
      return NextResponse.redirect(new URL(subpath ? `/docs${subpath}${url.search}` : `/docs${url.search}`, 'https://docs.lexinoai.in'), 307);
    }

    // If chat or workspace requested on www -> redirect to chat.lexinoai.in
    if (url.pathname.startsWith('/chat') || url.pathname.startsWith('/projects') || url.pathname.startsWith('/files') || url.pathname.startsWith('/console')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://chat.lexinoai.in'), 307);
    }

    // If login/signup requested on www -> redirect to accounts.lexinoai.in
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
      return NextResponse.redirect(new URL(url.pathname + url.search, 'https://accounts.lexinoai.in'), 307);
    }

    // Marketing pages (/, /pricing, /help, /terms, /privacy) serve directly
    const response = NextResponse.next();
    return applySecurityHeaders(response, reqId);
  }

  // =========================================================================
  // 6. LOCAL DEVELOPMENT & PREVIEW FALLBACK (localhost, 127.0.0.1, *.vercel.app)
  // =========================================================================
  if (!isLexinoDomain) {
    if (isConsoleRoute(req)) {
      if (!authObj.userId) {
        const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
        return applySecurityHeaders(notFoundRes, reqId);
      }
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(authObj.userId);
        const role = user.publicMetadata?.role;
        if (role !== 'OWNER' && role !== 'ADMIN') {
          const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
          return applySecurityHeaders(notFoundRes, reqId);
        }
      } catch {
        const notFoundRes = NextResponse.rewrite(new URL('/_not-found', req.url), { status: 404 });
        return applySecurityHeaders(notFoundRes, reqId);
      }
    } else if (isProtectedRoute(req)) {
      if (!authObj.userId) {
        await auth.protect();
        return;
      }
    }

    // Local dev: forward logged-in users from /login or /signup to /chat
    if ((url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) && authObj.userId) {
      const rawRedirect = url.searchParams.get('redirect_url') || url.searchParams.get('redirectUrl');
      const safeDest = rawRedirect && !rawRedirect.includes('/login') && !rawRedirect.includes('/signup')
        ? rawRedirect
        : '/chat';
      return NextResponse.redirect(new URL(safeDest, req.url), 307);
    }

    const response = NextResponse.next();
    if (isApiRoute(req) || isConsoleRoute(req)) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    return applySecurityHeaders(response, reqId);
  }

  // Default fallback
  const response = NextResponse.next();
  return applySecurityHeaders(response, reqId);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
