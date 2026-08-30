import { prisma } from './prisma';
import { calculateSubscriptionExpiry, evaluateSubscription, SubscriptionTier } from './subscription';
import { ensureDbTables } from './ensureDbTables';

export interface CanonicalUserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  tier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: Date | string | null;
}

/**
 * Synchronizes and resolves a user account across multiple devices (phone, laptop, tablet).
 * Guarantees that active subscriptions, payments, preferences, and history belong to the
 * user account (userId / email) and are automatically unlocked on any device.
 */
export async function syncCanonicalUser(profile: CanonicalUserProfile) {
  const { id: userId, email, name, avatarUrl, tier, subscriptionStatus, subscriptionExpiresAt } = profile;
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (process.env.DATABASE_URL) {
    try {
      await ensureDbTables();
    } catch (_) {}

    let dbUser: any = null;

    // 1. Check if user exists by Clerk User ID
    dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (dbUser) {
      // If email has changed or was a placeholder, update it
      if (normalizedEmail && dbUser.email !== normalizedEmail) {
        const conflictingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!conflictingUser) {
          dbUser = await prisma.user.update({
            where: { id: userId },
            data: {
              email: normalizedEmail,
              name: name || dbUser.name,
              avatarUrl: avatarUrl || dbUser.avatarUrl,
            },
          });
        } else if (conflictingUser.id !== userId) {
          // Merge conflicting account into active session
          dbUser = await mergeUserAccounts(conflictingUser.id, userId, { name, avatarUrl });
        }
      } else {
        dbUser = await prisma.user.update({
          where: { id: userId },
          data: {
            name: name || dbUser.name,
            avatarUrl: avatarUrl || dbUser.avatarUrl,
          },
        });
      }
    } else if (normalizedEmail) {
      // 2. User not found by ID. Check if an account already exists with this verified email
      const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingByEmail) {
        // Merge the existing record into the current session ID
        dbUser = await mergeUserAccounts(existingByEmail.id, userId, { name, avatarUrl });
      }
    }

    // 3. If still no record, create brand new user
    if (!dbUser) {
      const fallbackEmail = normalizedEmail || `${userId}@lexinoai.in`;
      const metaExpires = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
      const initialTier = (tier && tier !== 'FREE') ? tier : 'FREE';
      const initialStatus = (tier && tier !== 'FREE') ? (subscriptionStatus || 'active') : 'inactive';

      try {
        dbUser = await prisma.user.create({
          data: {
            id: userId,
            email: fallbackEmail,
            name: name || 'User',
            avatarUrl: avatarUrl || '',
            tier: initialTier,
            subscriptionStatus: initialStatus,
            subscriptionExpiresAt: metaExpires,
          },
        });
      } catch (createErr) {
        console.warn('⚠️ [Canonical User] Create conflict fallback:', createErr);
        dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: userId }, { email: fallbackEmail }] },
        });
      }
    }

    // 3.1. If Clerk has active tier metadata and DB is still FREE, sync Clerk metadata to DB!
    if (dbUser && dbUser.tier === 'FREE' && tier && tier !== 'FREE') {
      const metaExpires = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (metaExpires > new Date()) {
        console.log(`✨ [Canonical User] Syncing Clerk metadata plan (${tier}) to database for user ${userId}`);
        try {
          dbUser = await prisma.user.update({
            where: { id: userId },
            data: {
              tier,
              subscriptionStatus: subscriptionStatus || 'active',
              subscriptionExpiresAt: metaExpires,
              cooldownUntil: null,
              messageCountToday: 0,
            },
          });
        } catch (_) {}
      }
    }

    // 4. AUTHORITATIVE PAYMENT RECOVERY & MULTI-DEVICE UNIFICATION
    // If the user is currently evaluated as FREE, check the Payment table for any active paid order!
    if (dbUser && dbUser.tier === 'FREE') {
      try {
        if ((prisma as any)?.payment) {
          const paidPayment = await (prisma as any).payment.findFirst({
            where: {
              OR: [
                { userId: dbUser.id },
                ...(normalizedEmail ? [{ user: { email: normalizedEmail } }] : []),
              ],
              status: 'paid',
            },
            orderBy: { createdAt: 'desc' },
          });

          if (paidPayment) {
            const now = new Date();
            const calculatedExpiry = paidPayment.expiresAt
              ? new Date(paidPayment.expiresAt)
              : new Date(new Date(paidPayment.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);

            if (calculatedExpiry > now) {
              console.log(`✨ [Payment Recovery] Restoring active ${paidPayment.tier} subscription from Payment record (${paidPayment.orderId}) for user ${dbUser.id}`);
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  tier: paidPayment.tier,
                  subscriptionStatus: 'active',
                  subscriptionStartedAt: paidPayment.createdAt,
                  subscriptionExpiresAt: calculatedExpiry,
                  cooldownUntil: null,
                  messageCountToday: 0,
                },
              });
            }
          }
        }
      } catch (payRecErr) {
        console.warn('⚠️ [Payment Recovery Note]:', payRecErr);
      }
    }

    return dbUser;
  }

  // Offline / in-memory fallback
  return {
    id: userId,
    email: normalizedEmail || `${userId}@lexinoai.in`,
    name: name || 'User',
    avatarUrl: avatarUrl || '',
    tier: 'FREE',
    subscriptionStatus: 'inactive',
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    cooldownUntil: null,
    messageCountToday: 0,
  };
}

/**
 * Merges two user account records in PostgreSQL without losing subscriptions, payments, or messages.
 */
async function mergeUserAccounts(
  oldUserId: string,
  newUserId: string,
  profile: { name?: string | null; avatarUrl?: string | null }
) {
  if (oldUserId === newUserId) {
    return prisma.user.findUnique({ where: { id: newUserId } });
  }

  const oldUser = await prisma.user.findUnique({ where: { id: oldUserId } });
  if (!oldUser) {
    return prisma.user.findUnique({ where: { id: newUserId } });
  }

  console.log(`🔄 [Account Unification] Migrating subscription and data from ${oldUserId} to ${newUserId} (${oldUser.email})`);

  // 1. Reassign relations to the new userId
  try {
    if ((prisma as any)?.payment) {
      await (prisma as any).payment.updateMany({
        where: { userId: oldUserId },
        data: { userId: newUserId },
      });
    }
    await prisma.chatSession.updateMany({
      where: { userId: oldUserId },
      data: { userId: newUserId },
    });
    await prisma.message.updateMany({
      where: { userId: oldUserId },
      data: { userId: newUserId },
    });
  } catch (relErr) {
    console.warn('⚠️ [Account Unification] Note on reassigning relations:', relErr);
  }

  // 2. Delete old record
  try {
    await prisma.user.delete({ where: { id: oldUserId } });
  } catch (delErr) {
    console.warn('⚠️ [Account Unification] Note on deleting old user row:', delErr);
  }

  // 3. Create or update the new record with preserved subscription
  const newUser = await prisma.user.upsert({
    where: { id: newUserId },
    update: {
      email: oldUser.email,
      name: profile.name || oldUser.name,
      avatarUrl: profile.avatarUrl || oldUser.avatarUrl,
      tier: oldUser.tier,
      subscriptionStatus: oldUser.subscriptionStatus,
      subscriptionStartedAt: oldUser.subscriptionStartedAt,
      subscriptionExpiresAt: oldUser.subscriptionExpiresAt,
      cooldownUntil: oldUser.cooldownUntil,
      messageCountToday: oldUser.messageCountToday,
      preferences: oldUser.preferences || {},
    },
    create: {
      id: newUserId,
      email: oldUser.email,
      name: profile.name || oldUser.name,
      avatarUrl: profile.avatarUrl || oldUser.avatarUrl,
      tier: oldUser.tier,
      subscriptionStatus: oldUser.subscriptionStatus,
      subscriptionStartedAt: oldUser.subscriptionStartedAt,
      subscriptionExpiresAt: oldUser.subscriptionExpiresAt,
      cooldownUntil: oldUser.cooldownUntil,
      messageCountToday: oldUser.messageCountToday,
      preferences: oldUser.preferences || {},
    },
  });

  return newUser;
}

export { applyCentralSubscription } from './subscriptionService';

/**
 * Authoritative subscription activator: upgrades user by userId OR verified email.
 * This guarantees payments completed on mobile/webviews activate for the user on ALL devices.
 */
export async function activateSubscriptionForUser(params: {
  userId?: string | null;
  email?: string | null;
  targetTier: SubscriptionTier;
  planId: string;
  orderId: string;
  paymentId?: string | null;
  signature?: string | null;
  amount?: number;
}) {
  const { applyCentralSubscription } = await import('./subscriptionService');
  const result = await applyCentralSubscription({
    userId: params.userId,
    email: params.email,
    targetTier: params.targetTier,
    planId: params.planId,
    orderId: params.orderId,
    paymentId: params.paymentId,
    signature: params.signature,
    amount: params.amount,
    source: 'razorpay',
    action: 'ACTIVATE',
  });

  return {
    user: result.user,
    expiryInfo: result.expiryInfo,
  };
}
