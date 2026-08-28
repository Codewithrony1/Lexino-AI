import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';

const LOG_FILE = path.join(process.cwd(), 'admin-security-logs.json');

export interface SecurityLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  ip: string;
  userAgent: string;
  details?: any;
}

interface LockoutState {
  count: number;
  lastAttempt: string;
  lockoutUntil: string | null;
}

interface SecurityState {
  lockouts: Record<string, LockoutState>;
  logs: SecurityLog[];
}

function loadState(): SecurityState {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      return {
        lockouts: parsed.lockouts || {},
        logs: parsed.logs || [],
      };
    }
  } catch (err) {
    console.error('Error loading admin security state:', err);
  }
  return { lockouts: {}, logs: [] };
}

function saveState(state: SecurityState) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving admin security state:', err);
  }
}

// Extract IP and UA from Request headers
export async function getClientMetadata(req?: Request) {
  let ip = '127.0.0.1';
  let userAgent = 'Unknown Device';

  try {
    if (req) {
      ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      userAgent = req.headers.get('user-agent') || 'Unknown Device';
    } else {
      const headerStore = await headers();
      ip = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || '127.0.0.1';
      userAgent = headerStore.get('user-agent') || 'Unknown Device';
    }
    // Clean up IP if it has multiple values (comma separated)
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
  } catch (e) {
    console.warn('Failed to extract client metadata:', e);
  }

  return { ip, userAgent };
}

// Check if user/IP is locked out
export function isLockedOut(userId: string): { locked: boolean; remainingMs: number } {
  const state = loadState();
  const userLock = state.lockouts[userId];

  if (!userLock || !userLock.lockoutUntil) {
    return { locked: false, remainingMs: 0 };
  }

  const lockoutTime = new Date(userLock.lockoutUntil).getTime();
  const now = Date.now();

  if (now < lockoutTime) {
    return { locked: true, remainingMs: lockoutTime - now };
  }

  // Lockout expired, clear lockoutUntil but keep count for reference
  return { locked: false, remainingMs: 0 };
}

// Record a failed passphrase attempt
export async function recordFailedAttempt(userId: string, req?: Request) {
  const state = loadState();
  const userLock = state.lockouts[userId] || { count: 0, lastAttempt: '', lockoutUntil: null };
  const { ip, userAgent } = await getClientMetadata(req);

  userLock.count += 1;
  userLock.lastAttempt = new Date().toISOString();

  // If 5 or more failures, lock out for 15 minutes
  if (userLock.count >= 5) {
    const lockoutPeriod = 15 * 60 * 1000; // 15 minutes
    userLock.lockoutUntil = new Date(Date.now() + lockoutPeriod).toISOString();
  }

  state.lockouts[userId] = userLock;

  const newLog: SecurityLog = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action: 'LOGIN_FAILED',
    userId,
    ip,
    userAgent,
    details: { attempts: userLock.count, locked: userLock.count >= 5 },
  };

  state.logs.unshift(newLog);
  // Cap logs at 500 entries
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500);
  }

  saveState(state);
  return userLock;
}

// Record a successful login attempt
export async function recordSuccessfulLogin(userId: string, req?: Request) {
  const state = loadState();
  const { ip, userAgent } = await getClientMetadata(req);

  // Clear failed lockout count on success
  state.lockouts[userId] = {
    count: 0,
    lastAttempt: new Date().toISOString(),
    lockoutUntil: null,
  };

  const newLog: SecurityLog = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action: 'LOGIN_SUCCESS',
    userId,
    ip,
    userAgent,
  };

  state.logs.unshift(newLog);
  saveState(state);
}

// Log general admin dashboard actions
export async function logAdminAction(
  userId: string,
  action: string,
  details?: {
    targetUserId?: string;
    targetEmail?: string;
    oldPlan?: string;
    newPlan?: string;
    oldStatus?: string;
    newStatus?: string;
    oldExpiresAt?: Date | string | null;
    newExpiresAt?: Date | string | null;
    reason?: string;
    [key: string]: any;
  },
  req?: Request
) {
  const state = loadState();
  const { ip, userAgent } = await getClientMetadata(req);

  const newLog: SecurityLog = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip,
    userAgent,
    details,
  };

  state.logs.unshift(newLog);
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500);
  }
  saveState(state);

  // Persist to Neon PostgreSQL AdminAuditLog
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import('@/lib/prisma');
      const { ensureDbTables } = await import('@/lib/ensureDbTables');
      await ensureDbTables();

      if ((prisma as any)?.adminAuditLog) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId: userId,
            action,
            targetUserId: details?.targetUserId || 'system',
            targetEmail: details?.targetEmail || null,
            oldPlan: details?.oldPlan || null,
            newPlan: details?.newPlan || null,
            oldStatus: details?.oldStatus || null,
            newStatus: details?.newStatus || null,
            oldExpiresAt: details?.oldExpiresAt ? new Date(details.oldExpiresAt) : null,
            newExpiresAt: details?.newExpiresAt ? new Date(details.newExpiresAt) : null,
            reason: details?.reason || 'Manual Admin Action',
            ipAddress: ip,
            userAgent,
            metadata: details || {},
          },
        });
      }
    } catch (dbErr) {
      console.warn('⚠️ [Admin Audit Log] Could not write to DB table:', dbErr);
    }
  }
}

// Get logs (most recent first)
export function getSecurityLogs(): SecurityLog[] {
  return loadState().logs;
}
