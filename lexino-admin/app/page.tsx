'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ban,
  CheckCircle2,
  Clock3,
  Crown,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

type AdminAction = 'activateStudent' | 'activateUnlimited' | 'extendSubscription' | 'deactivateSubscription';

interface Payment {
  id: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  user?: {
    email?: string | null;
    name?: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  targetEmail?: string | null;
  targetUserId?: string | null;
  oldPlan?: string | null;
  newPlan?: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  tier: string;
  subscriptionStatus: string;
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  cooldownUntil: string | null;
  messageCountToday: number;
  createdAt: string;
  payments?: Payment[];
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  studentUsers: number;
  proUsers: number;
  recentPayments: Payment[];
  recentAuditLogs: AuditLog[];
}

const emptyStats: Stats = {
  totalUsers: 0,
  activeSubscriptions: 0,
  expiredSubscriptions: 0,
  studentUsers: 0,
  proUsers: 0,
  recentPayments: [],
  recentAuditLogs: [],
};

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return 'No expiry';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

function formatCurrency(payment: Payment) {
  if (typeof payment.amount !== 'number') return 'Amount unavailable';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: payment.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(payment.amount / 100);
}

function getInitials(name: string, email: string) {
  const source = name && name !== 'User' ? name : email;
  return source
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <section className={`stat-tile ${tone}`}>
      <div className="stat-icon">
        <Icon size={19} strokeWidth={2.2} />
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || 'inactive';
  const isActive = normalized === 'active';
  const isExpired = normalized === 'expired';

  return (
    <span className={`status-pill ${isActive ? 'active' : isExpired ? 'expired' : 'inactive'}`}>
      {isActive ? <CheckCircle2 size={14} /> : isExpired ? <Clock3 size={14} /> : <Ban size={14} />}
      {normalized}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStats = async () => {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch statistics');
    setStats({ ...emptyStats, ...data });
  };

  const fetchUsers = async (query = '') => {
    setLoading(true);
    const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    setUsers(data.users || []);
    setLoading(false);
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    setStatusMessage(null);
    try {
      await Promise.all([fetchStats(), fetchUsers(searchQuery)]);
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : 'Unable to refresh admin data',
        type: 'error',
      });
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    try {
      await fetchUsers(searchQuery);
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : 'Search failed',
        type: 'error',
      });
      setLoading(false);
    }
  };

  const handleAction = async (targetUserId: string, action: AdminAction, tier?: string, months = 1) => {
    setActionLoading(`${targetUserId}:${action}`);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          action,
          tier,
          months,
          reason: 'Manual action via Local Admin UI',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed');
      }

      setStatusMessage({ text: 'Account entitlement updated successfully.', type: 'success' });
      await Promise.all([fetchStats(), fetchUsers(searchQuery)]);
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : 'Action failed',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const planMix = useMemo(() => {
    const paid = stats.studentUsers + stats.proUsers;
    if (!paid) return 'No active paid mix yet';
    return `${stats.studentUsers} student / ${stats.proUsers} pro`;
  }, [stats.proUsers, stats.studentUsers]);

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={16} />
            Local admin console
          </div>
          <h1>Lexino Admin</h1>
          <p>Manage users, subscription entitlements, payments, and audit activity from one focused panel.</p>
        </div>

        <button className="icon-button refresh-button" onClick={refreshDashboard} disabled={refreshing} title="Refresh dashboard">
          {refreshing ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          <span>Refresh</span>
        </button>
      </section>

      {statusMessage && (
        <div className={`notice ${statusMessage.type}`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} title="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="stats-grid">
        <StatTile label="Total users" value={stats.totalUsers} detail="Accounts in database" icon={Users} tone="tone-ink" />
        <StatTile
          label="Active paid"
          value={stats.activeSubscriptions}
          detail="Current subscription access"
          icon={Activity}
          tone="tone-mint"
        />
        <StatTile label="Student" value={stats.studentUsers} detail="INR 49 monthly users" icon={GraduationCap} tone="tone-sky" />
        <StatTile label="Pro" value={stats.proUsers} detail="Unlimited tier users" icon={Crown} tone="tone-gold" />
        <StatTile label="Expired" value={stats.expiredSubscriptions} detail={planMix} icon={Clock3} tone="tone-coral" />
      </section>

      <section className="workspace-grid">
        <div className="users-panel">
          <div className="panel-heading">
            <div>
              <h2>User Accounts</h2>
              <p>{users.length} accounts listed, newest first</p>
            </div>
            <form onSubmit={handleSearch} className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search name, email, or Clerk ID"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <Loader2 className="spin" size={22} />
                        Loading accounts from the database
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <Sparkles size={22} />
                        No accounts found for this search.
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isActive = user.subscriptionStatus === 'active';
                    const actionKey = (action: AdminAction) => `${user.id}:${action}`;

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="identity-cell">
                            <span className="avatar">{getInitials(user.name, user.email)}</span>
                            <div>
                              <strong>{user.name || 'User'}</strong>
                              <span>{user.email}</span>
                              <code>{user.id}</code>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`plan-pill ${user.tier.toLowerCase()}`}>{user.tier}</span>
                        </td>
                        <td>
                          <StatusPill status={user.subscriptionStatus} />
                        </td>
                        <td>{formatDate(user.subscriptionExpiresAt)}</td>
                        <td>
                          <span className="usage-count">{user.messageCountToday} messages</span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button
                              disabled={Boolean(actionLoading)}
                              onClick={() => handleAction(user.id, 'activateStudent', 'STUDENT', 1)}
                              title="Activate Student for one month"
                            >
                              {actionLoading === actionKey('activateStudent') ? <Loader2 className="spin" size={14} /> : <GraduationCap size={14} />}
                              Student
                            </button>
                            <button
                              disabled={Boolean(actionLoading)}
                              onClick={() => handleAction(user.id, 'activateUnlimited', 'PRO', 1)}
                              title="Activate Pro for one month"
                            >
                              {actionLoading === actionKey('activateUnlimited') ? <Loader2 className="spin" size={14} /> : <Crown size={14} />}
                              Pro
                            </button>
                            {isActive && (
                              <button
                                disabled={Boolean(actionLoading)}
                                onClick={() => handleAction(user.id, 'extendSubscription', user.tier, 1)}
                                title="Extend current plan by one month"
                              >
                                {actionLoading === actionKey('extendSubscription') ? <Loader2 className="spin" size={14} /> : <Clock3 size={14} />}
                                Extend
                              </button>
                            )}
                            {isActive && (
                              <button
                                className="danger"
                                disabled={Boolean(actionLoading)}
                                onClick={() => handleAction(user.id, 'deactivateSubscription', 'FREE')}
                                title="Deactivate subscription"
                              >
                                {actionLoading === actionKey('deactivateSubscription') ? <Loader2 className="spin" size={14} /> : <Ban size={14} />}
                                Stop
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="activity-panel">
          <section>
            <div className="panel-heading compact">
              <h2>Recent Payments</h2>
            </div>
            <div className="event-list">
              {stats.recentPayments.length > 0 ? (
                stats.recentPayments.map((payment) => (
                  <article key={payment.id} className="event-item">
                    <div>
                      <strong>{formatCurrency(payment)}</strong>
                      <span>{payment.user?.email || 'Unknown account'}</span>
                    </div>
                    <small>{payment.status || 'recorded'}</small>
                  </article>
                ))
              ) : (
                <p className="quiet">No payment records yet.</p>
              )}
            </div>
          </section>

          <section>
            <div className="panel-heading compact">
              <h2>Audit Trail</h2>
            </div>
            <div className="event-list">
              {stats.recentAuditLogs.length > 0 ? (
                stats.recentAuditLogs.map((log) => (
                  <article key={log.id} className="event-item audit">
                    <div>
                      <strong>{log.action.replaceAll('_', ' ')}</strong>
                      <span>{log.targetEmail || log.targetUserId || 'Unknown target'}</span>
                    </div>
                    <small>{formatDate(log.createdAt, true)}</small>
                  </article>
                ))
              ) : (
                <p className="quiet">No admin actions recorded yet.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
