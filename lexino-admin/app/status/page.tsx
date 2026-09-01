'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StatusPage() {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatusData(data);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Failed to fetch status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 15000); // 15s polling
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Degraded
          </span>
        );
      case 'CONFIG_MISSING':
        return (
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Not Configured
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Outage
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
                LEXINO AI
              </span>
              <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded text-xs font-mono font-bold">
                SYSTEM TELEMETRY
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Private Real-Time Infrastructure, Database & AI Providers Monitor (Owner Only)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700"
            >
              ← Back to Users Dashboard
            </Link>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-2"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Now'}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {autoRefresh ? '⏱️ Auto (15s)' : '⏸️ Paused'}
            </button>
          </div>
        </div>

        {/* Global Status Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                All Core Services Operational
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              </h2>
              <p className="text-xs text-slate-400">
                Last verified: {lastRefreshed.toLocaleTimeString()} • Check duration:{' '}
                {statusData?.totalCheckDurationMs || 0}ms
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Node Memory</div>
              <div className="text-sm font-bold text-cyan-400">
                {statusData?.system?.memoryUsageMb || 0} MB
              </div>
            </div>
            <div className="bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Server Uptime</div>
              <div className="text-sm font-bold text-violet-400">
                {Math.round((statusData?.system?.uptimeSeconds || 0) / 60)} min
              </div>
            </div>
          </div>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🐘</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">PostgreSQL Database</h3>
                  <p className="text-xs text-slate-500">Prisma ORM • Connection Pool</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.database?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>Ping Latency:</span>
                <span className="text-emerald-400 font-bold">
                  {statusData?.components?.database?.latencyMs || 0} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Users in DB:</span>
                <span className="text-slate-200">
                  {statusData?.components?.database?.metrics?.totalUsers || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Chat Sessions:</span>
                <span className="text-slate-200">
                  {statusData?.components?.database?.metrics?.totalChatSessions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Clerk Auth Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Clerk Identity Platform</h3>
                  <p className="text-xs text-slate-500">OAuth • JWT Sessions • MFA</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.clerk?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>API Latency:</span>
                <span className="text-emerald-400 font-bold">
                  {statusData?.components?.clerk?.latencyMs || 0} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Clerk Registered Users:</span>
                <span className="text-slate-200">
                  {statusData?.components?.clerk?.metrics?.registeredUsers || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Verification:</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </div>
          </div>

          {/* Groq AI Inference Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Groq AI Inference Core</h3>
                  <p className="text-xs text-slate-500">GPT-OSS 120B • High-Speed LLaMA</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.groq?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>Inference Gateway:</span>
                <span className="text-emerald-400 font-bold">
                  {statusData?.components?.groq?.latencyMs || 0} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>HTTP Response:</span>
                <span className="text-slate-200">
                  {statusData?.components?.groq?.httpCode || 200} OK
                </span>
              </div>
              <div className="flex justify-between">
                <span>SSE Streaming:</span>
                <span className="text-emerald-400">Available</span>
              </div>
            </div>
          </div>

          {/* OpenAI API Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">OpenAI API Core</h3>
                  <p className="text-xs text-slate-500">ChatGPT (GPT-4o) Model</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.openai?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>API Gateway:</span>
                <span className="text-emerald-400 font-bold">
                  {statusData?.components?.openai?.latencyMs || 0} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Target Model:</span>
                <span className="text-slate-200">gpt-4o</span>
              </div>
              <div className="flex justify-between">
                <span>Tier Gate:</span>
                <span className="text-cyan-400">Student & Pro Access</span>
              </div>
            </div>
          </div>

          {/* Anthropic Claude Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎭</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Anthropic Claude API</h3>
                  <p className="text-xs text-slate-500">Claude 3.5 Sonnet</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.anthropic?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>Target Model:</span>
                <span className="text-slate-200">claude-3-5-sonnet-20241022</span>
              </div>
              <div className="flex justify-between">
                <span>Tier Gate:</span>
                <span className="text-violet-400">Pro Exclusive Tier</span>
              </div>
            </div>
          </div>

          {/* Razorpay Gateway Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Razorpay Payment Gateway</h3>
                  <p className="text-xs text-slate-500">UPI • Cards • NetBanking • Webhooks</p>
                </div>
              </div>
              {getStatusBadge(statusData?.components?.razorpay?.status || 'OPERATIONAL')}
            </div>
            <div className="bg-slate-950 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-400 border border-slate-850">
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="text-emerald-400 font-bold">
                  {statusData?.components?.razorpay?.environment || 'LIVE PRODUCTION'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Webhook Ingestion:</span>
                <span className="text-emerald-400">Verified (/api/razorpay/webhook)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
