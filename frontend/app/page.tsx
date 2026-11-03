'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WorkflowStatus } from '../components/WorkflowStatus';
import { InsightCard } from '../components/InsightCard';
import { RiskPanel } from '../components/RiskPanel';
import { HoldingsTable } from '../components/HoldingsTable';
import { SectorAllocation } from '../components/SectorAllocation';
import { ZerodhaLoginModal } from '../components/ZerodhaLoginModal';
import { PortfolioTrajectoryChart } from '../components/PortfolioTrajectoryChart';
import { SectorDonutChart } from '../components/SectorDonutChart';

const API_BASE = 'http://localhost:8000';

const SAMPLE_PORTFOLIOS = [
  { id: 'port_diversified_01', name: 'Balanced NIFTY Portfolio', desc: '5 large-cap stocks across 5 distinct sectors' },
  { id: 'port_concentrated_02', name: 'High Banking Concentration', desc: '4 holdings with >60% weight in Financial Services' },
  { id: 'port_volatile_03', name: 'High Volatility Small-Cap', desc: 'Energy, Telecom, and Banking turnaround plays' },
  { id: 'port_stale_04', name: 'Stale Data Scenario', desc: 'Simulates quote lag and telemetry edge cases' },
  { id: 'port_limited_05', name: 'Single Holding Portfolio', desc: 'Single stock asset allocation risk benchmark' },
];

export default function Dashboard() {
  const [portfolioSource, setPortfolioSource] = useState<'SAMPLE' | 'ZERODHA'>('SAMPLE');
  const [selectedSamplePortfolio, setSelectedSamplePortfolio] = useState('port_diversified_01');
  const [timeframe, setTimeframe] = useState('1M');
  const [activeTab, setActiveTab] = useState<'INTELLIGENCE' | 'HOLDINGS' | 'SECTORS'>('INTELLIGENCE');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('IDLE');
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Zerodha Live Connection state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [zerodhaSession, setZerodhaSession] = useState<any | null>(null);
  const [syncingMarket, setSyncingMarket] = useState(false);

  // Active portfolio ID computed based on source
  const currentPortfolioId = portfolioSource === 'ZERODHA' ? 'port_user_zerodha' : selectedSamplePortfolio;

  const triggerAnalysis = async (targetPortId: string = currentPortfolioId, targetTf: string = timeframe) => {
    setLoading(true);
    setStatus('PENDING');

    try {
      const res = await fetch(`${API_BASE}/api/portfolio-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: targetPortId, timeframe: targetTf }),
      });
      const data = await res.json();
      setJobId(data.job_id);

      // Poll until completed
      const pollInterval = setInterval(async () => {
        const pollRes = await fetch(`${API_BASE}/api/insights/${data.job_id}`);
        const pollData = await pollRes.json();
        setStatus(pollData.status);

        if (pollData.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setInsights(pollData.insights);
          setLoading(false);
        } else if (pollData.status === 'FAILED') {
          clearInterval(pollInterval);
          setLoading(false);
          alert(`Analysis failed: ${pollData.error_message}`);
        }
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatus('FAILED');
    }
  };

  // Check active Zerodha session and URL tab query on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'HOLDINGS' || tabParam === 'SECTORS' || tabParam === 'INTELLIGENCE') {
        setActiveTab(tabParam as any);
      }
      if (params.get('login') === 'true') {
        setIsLoginModalOpen(true);
      }
    }

    const checkInitialSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/zerodha/session`);
        const data = await res.json();
        if (data.is_connected) {
          setZerodhaSession(data);
          setPortfolioSource('ZERODHA');
          triggerAnalysis('port_user_zerodha', timeframe);
          return;
        }
      } catch (e) {}
      triggerAnalysis(selectedSamplePortfolio, timeframe);
    };
    checkInitialSession();
  }, []);

  const handleSamplePortfolioChange = (newPortId: string) => {
    setSelectedSamplePortfolio(newPortId);
    setPortfolioSource('SAMPLE');
    triggerAnalysis(newPortId, timeframe);
  };

  const handleSourceSelect = (source: 'SAMPLE' | 'ZERODHA') => {
    setPortfolioSource(source);
    if (source === 'ZERODHA') {
      setIsLoginModalOpen(true);
      triggerAnalysis('port_user_zerodha', timeframe);
    } else {
      triggerAnalysis(selectedSamplePortfolio, timeframe);
    }
  };

  const handleTimeframeChange = (newTf: string) => {
    setTimeframe(newTf);
    const targetPort = portfolioSource === 'ZERODHA' ? 'port_user_zerodha' : selectedSamplePortfolio;
    triggerAnalysis(targetPort, newTf);
  };

  const handleLoginSuccess = (session: any) => {
    setZerodhaSession(session);
    setPortfolioSource('ZERODHA');
    triggerAnalysis('port_user_zerodha', timeframe);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/zerodha/logout`, { method: 'POST' });
      setZerodhaSession(null);
      setPortfolioSource('SAMPLE');
      triggerAnalysis(selectedSamplePortfolio, timeframe);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncLiveMarket = async () => {
    setSyncingMarket(true);
    try {
      const res = await fetch(`${API_BASE}/api/zerodha/sync-live-market`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setZerodhaSession(data.session);
        triggerAnalysis('port_user_zerodha', timeframe);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMarket(false);
    }
  };

  const handleFeedback = async (cardId: string, action: string) => {
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, user_action: action }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const summary = insights?.summary_metrics || {};
  const risk = insights?.risk_metrics || {};
  const holdings = insights?.holdings || [];
  const sectorAnalysis = insights?.sector_analysis || {};

  const totalCurrent = summary.total_current_value || 0;
  const totalInvested = summary.total_invested || 0;
  const totalPnl = summary.total_unrealized_pnl || 0;
  const totalPnlPct = summary.total_pnl_pct || 0;
  const isProfit = totalPnl >= 0;

  // Timeframe specific metrics from deterministic analytics
  const tfReturnPct = summary.timeframe_return_pct !== undefined ? summary.timeframe_return_pct : totalPnlPct;
  const tfPnl = summary.timeframe_pnl !== undefined ? summary.timeframe_pnl : totalPnl;
  const tfLabel = summary.timeframe_label || `${timeframe} Trailing Performance`;
  const isTfProfit = tfReturnPct >= 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Zerodha Login Modal */}
      <ZerodhaLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Top Zerodha Brand Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                    Zerodha Kite
                  </span>
                  <span className="text-xs bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                    AI Financial Intelligence
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  SEBI-governed portfolio analytics &amp; real-time Kite market intelligence
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Kite Login / Active Session Pill */}
              {zerodhaSession?.is_connected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (portfolioSource !== 'ZERODHA') {
                        setPortfolioSource('ZERODHA');
                        triggerAnalysis('port_user_zerodha', timeframe);
                      } else {
                        setIsLoginModalOpen(true);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      portfolioSource === 'ZERODHA'
                        ? 'bg-amber-50 border-orange-300 text-orange-950 ring-1 ring-orange-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={portfolioSource === 'ZERODHA' ? "Click to view or switch active Zerodha account" : "Switch back to active Zerodha Kite portfolio"}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-800">{zerodhaSession.user_name}</span>
                    <span className="text-[10px] bg-orange-200/60 text-orange-900 font-mono font-bold px-1.5 py-0.5 rounded">
                      {zerodhaSession.user_id}
                    </span>
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>

                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1.5"
                    title="Open Kite Login Panel"
                  >
                    <span>⚡ Kite Login</span>
                  </button>

                  <button
                    onClick={handleSyncLiveMarket}
                    disabled={syncingMarket || loading}
                    title="Re-query live quotes from current NSE market"
                    className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 font-semibold text-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{syncingMarket ? 'Syncing...' : '↻ Sync Market'}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    title="Disconnect Zerodha Session"
                    className="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1.5 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                  <span>⚡ Kite Login</span>
                </button>
              )}

              <Link
                href="/operations"
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1.5"
              >
                <span>Compliance Console</span>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Live Zerodha Account Active Banner */}
        {zerodhaSession?.is_connected && portfolioSource === 'ZERODHA' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-950">
                  Live Kite Portfolio Active: {zerodhaSession.user_name} ({zerodhaSession.user_id})
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Live NSE Synced
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Analyzing {zerodhaSession.holdings?.length || 0} real portfolio holdings with current market quotes across {timeframe} timeframe.
              </p>
            </div>
          </div>
        )}

        {/* Portfolio Selection & Timeframe Toolbar (Unified Baseline) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Left: Source Selector & Sample Dropdown (Only visible in Sample Mode) */}
            {portfolioSource === 'SAMPLE' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    onClick={() => handleSourceSelect('SAMPLE')}
                    className="px-3.5 py-2 rounded-md bg-white text-slate-900 shadow-xs font-semibold"
                  >
                    Sample Portfolios
                  </button>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-3 py-2 rounded-md text-orange-600 hover:text-orange-700 font-bold transition flex items-center gap-1"
                    title="Open Kite Login Panel (API, Demo, CSV)"
                  >
                    <span>{zerodhaSession?.is_connected ? '⚙ Login Panel' : '⚡ Kite Login'}</span>
                  </button>
                </div>

                {/* Sample Portfolio Dropdown with explicit chevron and hover elevation */}
                <div className="relative flex-1 max-w-md w-full">
                  <select
                    value={selectedSamplePortfolio}
                    onChange={(e) => handleSamplePortfolioChange(e.target.value)}
                    className="w-full appearance-none border rounded-lg pl-3.5 pr-10 py-2 text-sm font-semibold shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition hover:shadow-xs cursor-pointer bg-white border-slate-300 text-slate-800 hover:border-slate-400"
                  >
                    {SAMPLE_PORTFOLIOS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              /* When logged in to Kite account: Sample selector & dropdown are hidden */
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">
                  Live Portfolio Analysis
                </span>
                <span className="text-xs text-slate-400">
                  ({zerodhaSession?.holdings?.length || 0} holdings synced)
                </span>
              </div>
            )}

            {/* Right: Timeframe Filter & Execute Button (Unified Baseline) */}
            <div className="flex items-center justify-end gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                  Timeframe:
                </span>
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                  {['1W', '1M', '3M', '1Y'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-md transition font-bold ${
                        timeframe === tf
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-50'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => triggerAnalysis(currentPortfolioId, timeframe)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2 h-9"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Computing...</span>
                  </>
                ) : (
                  <span>Generate Intelligence</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stepper Status Indicator (Collapsible when completed) */}
        {status !== 'IDLE' && <WorkflowStatus status={status} />}

        {/* Executive Valuation Header Card (Unified Light Theme with Gradient Accent Strip) */}
        {insights && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-blue-600 to-indigo-600" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">
                    Portfolio Executive Context
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                    {timeframe} Horizon
                  </span>
                  {portfolioSource === 'ZERODHA' && (
                    <span className="text-[10px] bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded border border-orange-200">
                      Zerodha Kite Live
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 max-w-3xl leading-relaxed">
                  {insights.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold ${
                  insights.data_freshness === 'REAL_TIME'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  ● {insights.data_freshness || 'REAL_TIME'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar with Distinct Typographic Weights */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Current Valuation</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {formatCurrency(totalCurrent)}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Cost: {formatCurrency(totalInvested)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Total Unrealized P&amp;L</div>
                <div className={`text-2xl font-black font-mono mt-1 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%
                </div>
                <div className={`text-xs font-mono font-semibold mt-0.5 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isProfit ? '+' : ''}{formatCurrency(totalPnl)} Overall
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <span>{timeframe} Trailing Return</span>
                </div>
                <div className={`text-2xl font-black font-mono mt-1 ${isTfProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isTfProfit ? '+' : ''}{tfReturnPct.toFixed(2)}%
                </div>
                <div className={`text-xs font-mono font-semibold mt-0.5 ${isTfProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isTfProfit ? '+' : ''}{formatCurrency(tfPnl)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Health Score</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {insights.portfolio_health_score ?? 80}
                  </span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (insights.portfolio_health_score || 80) >= 75
                        ? 'bg-emerald-500'
                        : (insights.portfolio_health_score || 80) >= 55
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${insights.portfolio_health_score || 80}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Concentration</div>
                <div className="mt-1">
                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    summary.concentration_status === 'HIGH'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : summary.concentration_status === 'MODERATE'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {summary.concentration_status || 'MODERATE'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  HHI: {summary.hhi_index?.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Visual Intelligence & Trajectory Charts */}
        {insights && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Chart 1: Performance Trajectory vs Benchmark (2 cols) */}
            <div className="lg:col-span-2">
              <PortfolioTrajectoryChart
                timeframe={timeframe}
                totalCurrentValue={totalCurrent}
                timeframeReturnPct={tfReturnPct}
                timeframePnl={tfPnl}
                portfolioBeta={risk.portfolio_beta}
              />
            </div>

            {/* Chart 2: Interactive Sector Donut Allocation (1 col) */}
            <div className="lg:col-span-1">
              <SectorDonutChart
                sectorAnalysis={sectorAnalysis}
                holdings={holdings}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {insights && (
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 mb-6 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('INTELLIGENCE')}
                className={`py-3 px-4 border-b-2 transition ${
                  activeTab === 'INTELLIGENCE'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                AI Insights &amp; Risk ({insights.recommendation_cards?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('HOLDINGS')}
                className={`py-3 px-4 border-b-2 transition ${
                  activeTab === 'HOLDINGS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Holdings Breakdown ({holdings.length})
              </button>
              <button
                onClick={() => setActiveTab('SECTORS')}
                className={`py-3 px-4 border-b-2 transition ${
                  activeTab === 'SECTORS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sector Exposure
              </button>
            </div>

            {/* Tab 1: AI Intelligence & Risk Panel */}
            {activeTab === 'INTELLIGENCE' && (
              <div>
                <RiskPanel
                  metrics={risk}
                  hhiIndex={summary.hhi_index || 0}
                  concentrationStatus={summary.concentration_status || 'DIVERSIFIED'}
                  timeframe={timeframe}
                />

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Actionable Intelligence &amp; Explainable Cards
                    </h3>
                    <span className="text-xs text-slate-500">
                      Pre-delivery validated against SEBI regulatory safety policies
                    </span>
                  </div>

                  {insights.recommendation_cards?.map((card: any) => (
                    <InsightCard key={card.card_id} card={card} onFeedback={handleFeedback} />
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Holdings Table */}
            {activeTab === 'HOLDINGS' && (
              <div>
                <HoldingsTable holdings={holdings} />
              </div>
            )}

            {/* Tab 3: Sector Allocation */}
            {activeTab === 'SECTORS' && (
              <div>
                <SectorAllocation sectorAnalysis={sectorAnalysis} holdings={holdings} />
              </div>
            )}

            {/* Regulatory Disclaimer Footer (Polished SEBI compliance) */}
            <footer className="mt-10 p-5 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 text-center leading-relaxed shadow-2xs">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  SEBI Regulatory Compliance &amp; Safe Harbor Notice
                </span>
              </div>
              <p className="max-w-4xl mx-auto text-slate-500">
                {insights.regulatory_disclaimer ||
                  'This platform generates algorithmic portfolio analytics and explainable insights for educational and informational purposes only. In accordance with SEBI (Investment Advisers) Regulations, 2013, this automated system does not constitute personalized financial advice, solicitation, or discretionary portfolio management.'}
              </p>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
