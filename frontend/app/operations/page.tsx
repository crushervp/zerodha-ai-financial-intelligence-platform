'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function OperationsConsole() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/operations/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance & Operations Console</h1>
          <p className="text-sm text-slate-500">Live monitoring, MCP tool telemetry, and regulatory audit status</p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
        >
          ← Back to Investor Hub
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Loading telemetry metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pipeline Jobs</div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{metrics?.total_jobs || 0}</div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Analyses</div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">{metrics?.completed_jobs || 0}</div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{metrics?.success_rate_pct || 100}%</div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tool Invocations</div>
              <div className="text-2xl font-bold text-indigo-600 mt-2">{metrics?.recent_tool_calls || 0}</div>
            </div>
          </div>

          {/* Audit Controls & Regulatory Disclosures */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">SEBI Compliance Guardrails & Audits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Pre-Delivery Filter</span>
                <span className="text-emerald-700 font-semibold">ACTIVE</span>
                <p className="text-slate-500 mt-1">Blocks buy/sell mandates, guaranteed returns, or multibagger phrasing.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Audit Snapshots</span>
                <span className="text-emerald-700 font-semibold">ACTIVE</span>
                <p className="text-slate-500 mt-1">Full prompt, model version, input context, and raw output persisted for review.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">User Feedback Log</span>
                <span className="text-emerald-700 font-semibold">{metrics?.total_feedback_entries || 0} Recorded</span>
                <p className="text-slate-500 mt-1">Captures helpful/not helpful votes directly into the compliance review store.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}