'use client';

import React, { useState, useEffect } from 'react';

interface Payment {
  id: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  planId: string;
  tier: string;
  status: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  oldPlan?: string;
  newPlan?: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: string;
  subscriptionStatus: string;
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  cooldownUntil: string | null;
  messageCountToday: number;
  createdAt: string;
  syncStatus: 'MATCHED' | 'NOT_SYNCED' | 'ORPHANED';
  payments?: Payment[];
  auditLogs?: AuditLog[];
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  studentUsers: number;
  proUsers: number;
  recentPayments: any[];
  recentAuditLogs: any[];
  dbConnected: boolean;
  clerkConnected: boolean;
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
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
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
          reason: 'Manual activation via Local Admin Dashboard',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ text: `Successfully executed ${action} for ${targetUserId}! 🎉`, type: 'success' });
        await fetchStats();
        await fetchUsers(searchQuery);
        if (selectedUser && selectedUser.id === targetUserId) {
          setSelectedUser((prev) => (prev ? { ...prev, tier: data.user.tier, subscriptionStatus: data.user.subscriptionStatus, subscriptionExpiresAt: data.user.subscriptionExpiresAt } : null));
        }
      } else {
        setStatusMessage({ text: data.error || 'Action execution failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-6 max-w-7xl mx-auto font-sans">
      {/* Header & Diagnostics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00f0ff] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">
              Lexino AI — Master Admin Engine
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              Port 3001
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Authoritative Clerk Identity + Neon PostgreSQL Subscription Management & Unified Audit Trail.
          </p>
        </div>

        {/* Live Service Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${stats?.clerkConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Clerk: {stats?.clerkConnected ? 'Connected' : 'Offline'}
          </span>
          <span className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${stats?.dbConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            Neon DB: {stats?.dbConnected ? 'Connected' : 'Standby / Local'}
          </span>
          <button
            onClick={() => {
              fetchStats();
              fetchUsers(searchQuery);
            }}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`mt-4 p-3.5 rounded-xl text-sm flex items-center justify-between transition-all ${
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

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Clerk Users</p>
          <h3 className="text-2xl font-bold mt-1 text-white">{stats?.totalUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-cyan-300 font-medium uppercase tracking-wider">Active Subscriptions</p>
          <h3 className="text-2xl font-bold mt-1 text-cyan-400">{stats?.activeSubscriptions ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <p className="text-xs text-purple-300 font-medium uppercase tracking-wider">Student Plan (₹49)</p>
          <h3 className="text-2xl font-bold mt-1 text-purple-400">{stats?.studentUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-300 font-medium uppercase tracking-wider">Pro / Unlimited (₹299)</p>
          <h3 className="text-2xl font-bold mt-1 text-amber-400">{stats?.proUsers ?? '...'}</h3>
        </div>
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <p className="text-xs text-rose-300 font-medium uppercase tracking-wider">Expired Plans</p>
          <h3 className="text-2xl font-bold mt-1 text-rose-400">{stats?.expiredSubscriptions ?? '...'}</h3>
        </div>
      </div>

      {/* Search Input */}
      <div className="mt-8">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search ANY real user by Email (e.g. user@gmail.com), Clerk ID (user_...), or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 text-white placeholder-gray-500 font-mono"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-medium text-sm rounded-xl text-black font-semibold transition"
          >
            Search Directory
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchUsers('');
              }}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Users Directory Table */}
      <div className="mt-6 rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white">Production User Directory & Entitlements</h2>
          <span className="text-xs text-gray-400 font-mono">{users.length} accounts retrieved</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User Identity</th>
                <th className="px-6 py-3.5">Database Sync</th>
                <th className="px-6 py-3.5">Plan Tier</th>
                <th className="px-6 py-3.5">Subscription Status</th>
                <th className="px-6 py-3.5">Expiry Date</th>
                <th className="px-6 py-3.5 text-right">Admin Actions (1-Month)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Retrieving authentic accounts from Clerk & Neon...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {u.name || 'User'}
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="text-[11px] text-cyan-400 hover:underline"
                              >
                                [Inspect]
                              </button>
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{u.email}</div>
                            <div className="text-[11px] text-gray-600 font-mono">{u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${
                            u.syncStatus === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : u.syncStatus === 'NOT_SYNCED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {u.syncStatus === 'MATCHED' ? '✓ Synced (Neon)' : u.syncStatus === 'NOT_SYNCED' ? 'Clerk Only' : 'Neon Only'}
                        </span>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e0e14] border border-white/10 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Account Details: {selectedUser.name}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Clerk User ID</span>
                <span className="text-white select-all">{selectedUser.id}</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Primary Email</span>
                <span className="text-white select-all">{selectedUser.email}</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Current Plan Tier</span>
                <span className="text-cyan-400 font-bold">{selectedUser.tier}</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Subscription Status</span>
                <span className="text-emerald-400">{selectedUser.subscriptionStatus}</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Started At</span>
                <span className="text-gray-300">{selectedUser.subscriptionStartedAt ? new Date(selectedUser.subscriptionStartedAt).toLocaleString() : '—'}</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-500 block">Expires At</span>
                <span className="text-amber-400">{selectedUser.subscriptionExpiresAt ? new Date(selectedUser.subscriptionExpiresAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Verified Razorpay Payments</h4>
              {selectedUser.payments && selectedUser.payments.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.payments.map((p) => (
                    <div key={p.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold">{p.orderId}</span>
                        <span className="text-gray-500 block">Payment ID: {p.paymentId || 'Pending'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">₹{p.amount / 100}</span>
                        <span className="text-gray-500 block">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No Razorpay payment records found for this account.</p>
              )}
            </div>

            {/* Audit History */}
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Admin Action Trail</h4>
              {selectedUser.auditLogs && selectedUser.auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.auditLogs.map((l) => (
                    <div key={l.id} className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-cyan-400 font-bold">{l.action}</span>
                        <span className="text-gray-400 block">{l.reason || 'Manual modification'}</span>
                      </div>
                      <span className="text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No admin actions recorded on this account.</p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs rounded-xl font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
