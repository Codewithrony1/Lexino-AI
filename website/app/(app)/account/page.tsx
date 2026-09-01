import type { Metadata } from 'next';
import { UserProfile } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { lexinoClerkAppearance } from '@/lib/clerkAppearance';
import { prisma } from '@/lib/prisma';
import { evaluateSubscription } from '@/lib/subscription';
import { PLANS } from '@/lib/plans';
import { ensureDbTables } from '@/lib/ensureDbTables';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account & Subscription Settings — Lexino AI',
  description: 'Manage your Lexino AI subscription tier, daily query quotas, security preferences, and profile details.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
  let authResult: any = null;
  try {
    authResult = await auth();
  } catch {
    authResult = null;
  }
  
  if (!authResult?.userId) {
    redirect('/login?redirect_url=/account');
  }

  const userId = authResult.userId;
  let userEmail = '';
  let userName = 'User';
  let avatarUrl = '';

  try {
    const curUser = await currentUser();
    if (curUser) {
      userEmail = (curUser.emailAddresses[0]?.emailAddress || '').toLowerCase().trim();
      userName = `${curUser.firstName || ''} ${curUser.lastName || ''}`.trim() || curUser.username || 'User';
      avatarUrl = curUser.imageUrl || '';
    }
  } catch (_) {}

  let dbUser: any = null;
  if (process.env.DATABASE_URL) {
    try {
      await ensureDbTables();
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          payments: {
            where: { status: 'paid' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!dbUser && userEmail) {
        dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
          include: {
            payments: {
              where: { status: 'paid' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
      }
    } catch (dbErr) {
      console.warn('⚠️ [Account Page] Database lookup warning:', dbErr);
    }
  }

  const subInfo = evaluateSubscription(dbUser);
  const activeTier = subInfo.tier;
  const isExpired = subInfo.isExpired;
  const status = subInfo.status; // 'active' | 'expired' | 'inactive'

  // Auto-expire in database if past expiration date
  if (isExpired && dbUser && dbUser.tier !== 'FREE' && process.env.DATABASE_URL) {
    try {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          tier: 'FREE',
          subscriptionStatus: 'expired',
        },
      });
    } catch (updateErr) {
      console.warn('⚠️ [Account Page] Auto-expiry sync note:', updateErr);
    }
  }

  const latestPayment = dbUser?.payments?.[0] || null;
  const planKey = activeTier === 'PRO' ? 'pro' : (activeTier === 'STUDENT' ? 'student' : 'explorer');
  const planDetails = PLANS[planKey] || PLANS['explorer'];

  const dailyLimit = activeTier === 'PRO' ? 1500 : (activeTier === 'STUDENT' ? 300 : 50);
  const queriesUsedToday = dbUser?.messageCountToday || 0;
  const queriesRemainingToday = Math.max(0, dailyLimit - queriesUsedToday);
  const usagePercent = Math.min(100, Math.round((queriesUsedToday / dailyLimit) * 100));

  const expiryFormatted = subInfo.expiresAt
    ? new Date(subInfo.expiresAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030506 0%, #071017 44%, #020405 100%)',
      color: '#f8fafc',
      padding: '40px 20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(52, 211, 153, 0.22)',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>Account & Subscription Hub</h1>
            <p style={{ margin: '4px 0 0', color: '#a6b6c8', fontSize: '13.5px' }}>Manage your Lexino AI subscription tier, quota limits, and security controls</p>
          </div>
          <Link href="/chat" style={{
            background: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.22)',
            color: '#34d399',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}>
            ← Return to Chat
          </Link>
        </header>

        {/* Real-Time Subscription & Billing Status Card (Phase 9.5) */}
        <section style={{
          background: 'rgba(9, 16, 24, 0.75)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>💳</span>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                  Current Plan: <span style={{ color: activeTier === 'PRO' ? '#00f0ff' : (activeTier === 'STUDENT' ? '#fbbf24' : '#34d399') }}>{planDetails.name}</span>
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: activeTier === 'PRO' ? 'rgba(0, 240, 255, 0.15)' : (activeTier === 'STUDENT' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(148, 163, 184, 0.15)'),
                  color: activeTier === 'PRO' ? '#00f0ff' : (activeTier === 'STUDENT' ? '#fbbf24' : '#94a3b8'),
                  border: `1px solid ${activeTier === 'PRO' ? 'rgba(0, 240, 255, 0.3)' : (activeTier === 'STUDENT' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(148, 163, 184, 0.3)')}`,
                }}>
                  {status === 'active' ? '● Active' : (status === 'expired' ? '⚠️ Expired' : 'Free Tier')}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                {activeTier === 'FREE'
                  ? 'You are currently on the free Explorer tier with 50 daily queries.'
                  : `Active ${planDetails.name} Plan subscription with priority neural streaming.`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/pricing" style={{
                background: activeTier === 'FREE' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '9px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}>
                {activeTier === 'FREE' ? 'Upgrade Plan ⚡' : 'Change / Renew Plan'}
              </Link>
            </div>
          </div>

          {/* Quota and Validity Breakdown Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Daily Quota</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {dailyLimit} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>queries / day</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Remaining Today</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: queriesRemainingToday > 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                {queriesRemainingToday} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>available</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Validity / Renewal</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: expiryFormatted ? '#f8fafc' : '#94a3b8', marginTop: '4px' }}>
                {expiryFormatted ? `Renews on ${expiryFormatted}` : 'No expiry (Free Tier)'}
              </div>
            </div>
          </div>

          {/* Daily Usage Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>Today's Energy Consumption</span>
              <span>{queriesUsedToday} / {dailyLimit} queries used ({usagePercent}%)</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${usagePercent}%`,
                height: '100%',
                background: usagePercent > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #00f0ff)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </section>

        {/* Clerk Security & Profile Management */}
        <section style={{
          background: 'rgba(9, 16, 24, 0.65)',
          border: '1px solid rgba(52, 211, 153, 0.15)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <UserProfile appearance={lexinoClerkAppearance} routing="hash" />
        </section>
      </div>
    </main>
  );
}
