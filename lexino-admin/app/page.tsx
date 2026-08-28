'use client';

import React, { useState, useEffect } from 'react';

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
  payments?: any[];
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  studentUsers: number;
  proUsers: number;
  recentPayments: any[];
  recentAuditLogs: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const handleAction = async (targetUserId: string, action: string, tier?: string, months = 1) => {
    setActionLoading(targetUserId);
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
      if (res.ok && data.success) {
        setStatusMessage({ text: `Successfully applied ${action} on account!`, type: 'success' });
        await fetchStats();
        await fetchUsers(searchQuery);
      } else {
        setStatusMessage({ text: data.error || 'Action failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00f0ff] via-[#3b82f6] to-[#8a2be2] bg-clip-text text-transparent">
              Lexino AI — Private Local Admin
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              localhost:3001
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Authoritative account management, manual 1-month subscriptions, and security audit logs.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchUsers(searchQuery);
          }}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-sm border border-white/10 rounded-lg transition"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`mt-4 p-3.5 rounded-lg text-sm flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="p-4 rounded-xl glass-panel border border-white/10">
          <p className="text-xs text-gray-400 font-medium uppercase">Total Users</p>
          <h3 className="text-2xl font-bold mt-1 text-white">{stats?.totalUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-cyan-500/20 bg-cyan-500/5">
          <p className="text-xs text-cyan-300 font-medium uppercase">Active Subscriptions</p>
          <h3 className="text-2xl font-bold mt-1 text-cyan-400">{stats?.activeSubscriptions ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-purple-500/20 bg-purple-500/5">
          <p className="text-xs text-purple-300 font-medium uppercase">Student (₹49/mo)</p>
          <h3 className="text-2xl font-bold mt-1 text-purple-400">{stats?.studentUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-300 font-medium uppercase">Pro / Unlimited</p>
          <h3 className="text-2xl font-bold mt-1 text-amber-400">{stats?.proUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-rose-500/20 bg-rose-500/5">
          <p className="text-xs text-rose-300 font-medium uppercase">Expired Plans</p>
          <h3 className="text-2xl font-bold mt-1 text-rose-400">{stats?.expiredSubscriptions ?? '...'}</h3>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-8">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search ANY Lexino account by Email (e.g. user@gmail.com) or Clerk User ID (user_...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 text-white placeholder-gray-500 font-mono"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-medium text-sm rounded-xl text-black font-semibold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="mt-6 glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-base font-semibold">User Accounts & Subscription Entitlements</h2>
          <span className="text-xs text-gray-400">{users.length} accounts listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User Identity</th>
                <th className="px-6 py-3.5">Plan Tier</th>
                <th className="px-6 py-3.5">Subscription Status</th>
                <th className="px-6 py-3.5">Expiry Date</th>
                <th className="px-6 py-3.5 text-right">Admin Actions (1-Month)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading accounts from database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No accounts found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isPro = u.tier === 'PRO';
                  const isStudent = u.tier === 'STUDENT';
                  const isActive = u.subscriptionStatus === 'active';
                  const isExpired = u.subscriptionStatus === 'expired';

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name || 'User'}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{u.email}</div>
                        <div className="text-[11px] text-gray-600 font-mono">{u.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            isPro
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isStudent
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {u.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isExpired
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'text-gray-500'
                          }`}
                        >
                          ● {u.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-300">
                        {u.subscriptionExpiresAt
                          ? new Date(u.subscriptionExpiresAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => handleAction(u.id, 'activateStudent', 'STUDENT', 1)}
                            className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg transition"
                          >
                            + Student (1 Mo)
                          </button>

                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => handleAction(u.id, 'activateUnlimited', 'PRO', 1)}
                            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs rounded-lg transition"
                          >
                            + Pro (1 Mo)
                          </button>

                          {isActive && (
                            <button
                              disabled={actionLoading === u.id}
                              onClick={() => handleAction(u.id, 'extendSubscription', u.tier, 1)}
                              className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs rounded-lg transition"
                            >
                              +1 Mo Extend
                            </button>
                          )}

                          {isActive && (
                            <button
                              disabled={actionLoading === u.id}
                              onClick={() => handleAction(u.id, 'deactivateSubscription', 'FREE')}
                              className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs rounded-lg transition"
                            >
                              Deactivate
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

      {/* Recent Admin Audit Logs */}
      <div className="mt-8 glass-panel rounded-2xl border border-white/10 p-6">
        <h3 className="text-base font-semibold mb-4">Security & Administrator Audit Trail</h3>
        <div className="space-y-2">
          {stats?.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
            stats.recentAuditLogs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold">{log.action}</span>
                  <span className="text-gray-300">Target: {log.targetEmail || log.targetUserId}</span>
                  {log.newPlan && <span className="text-gray-500">Plan: {log.newPlan}</span>}
                </div>
                <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No audit logs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
