'use client';

import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

interface ZerodhaLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: any) => void;
}

export const ZerodhaLoginModal: React.FC<ZerodhaLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'DEMO' | 'KITE_CONNECT' | 'CSV'>('DEMO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo state
  const [selectedDemoId, setSelectedDemoId] = useState('ZR1001');
  const [customClientId, setCustomClientId] = useState('');
  const [password, setPassword] = useState('••••••••');
  const [totp, setTotp] = useState('834921');

  // Kite Connect API state
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [requestToken, setRequestToken] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  // CSV state
  const [csvContent, setCsvContent] = useState('');

  if (!isOpen) return null;

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientId = customClientId.trim() || selectedDemoId;
      const res = await fetch(`${API_BASE}/api/zerodha/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_type: 'DEMO',
          client_id: clientId,
          password,
          totp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLoginSuccess(data.session);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKiteConnectLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = { auth_type: 'KITE_CONNECT', api_key: apiKey };
      if (accessToken) {
        payload.access_token = accessToken;
      } else {
        payload.request_token = requestToken;
        payload.api_secret = apiSecret;
      }

      const res = await fetch(`${API_BASE}/api/zerodha/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Kite Connect login failed');
      onLoginSuccess(data.session);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!csvContent.trim()) throw new Error('Please paste your Kite holdings CSV content.');
      const res = await fetch(`${API_BASE}/api/zerodha/upload-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: csvContent,
          client_id: 'MY_KITE_STATEMENT',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'CSV upload failed');
      onLoginSuccess(data.session);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white text-base shadow-xs">
              K
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Connect Zerodha Account</span>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 font-mono font-semibold px-2 py-0.5 rounded border border-orange-500/40">
                  Kite Connect
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze live holdings with real-time NSE market prices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setTab('DEMO')}
            className={`py-3 text-center border-b-2 transition ${
              tab === 'DEMO'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kite One-Click
          </button>
          <button
            onClick={() => setTab('KITE_CONNECT')}
            className={`py-3 text-center border-b-2 transition ${
              tab === 'KITE_CONNECT'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kite API Keys
          </button>
          <button
            onClick={() => setTab('CSV')}
            className={`py-3 text-center border-b-2 transition ${
              tab === 'CSV'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload Statement
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              ⚠ {error}
            </div>
          )}

          {/* Tab 1: Demo / Interactive Login */}
          {tab === 'DEMO' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Select Verified Zerodha Account:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => {
                      setSelectedDemoId('ZR1001');
                      setCustomClientId('');
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedDemoId === 'ZR1001' && !customClientId
                        ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoAccount"
                      checked={selectedDemoId === 'ZR1001' && !customClientId}
                      onChange={() => {}}
                      className="mt-1 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Rahul Sharma (ZR1001)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        6 Large-cap holdings (RELIANCE, HDFCBANK, INFY, TATAMOTORS, ICICIBANK, TCS)
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setSelectedDemoId('ZR2002');
                      setCustomClientId('');
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedDemoId === 'ZR2002' && !customClientId
                        ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoAccount"
                      checked={selectedDemoId === 'ZR2002' && !customClientId}
                      onChange={() => {}}
                      className="mt-1 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Priya Patel (ZR2002)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Banking & Financial concentration (HDFCBANK, ICICIBANK, SBIN, YESBANK)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Or Enter Your Custom Client ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. ZD9981"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  className="w-full text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Kite Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    App 2FA TOTP
                  </label>
                  <input
                    type="text"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 leading-relaxed">
                ℹ Real-time integration: Upon login, stock CMPs are live-queried against current NSE tick quotes to compute live P&L and metrics.
              </div>

              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating with Kite...' : 'Login with Zerodha Kite'}
              </button>
            </div>
          )}

          {/* Tab 2: Kite Connect API */}
          {tab === 'KITE_CONNECT' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Kite API Key:
                </label>
                <input
                  type="text"
                  placeholder="e.g. abcdef123456"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Kite Access Token:
                </label>
                <input
                  type="password"
                  placeholder="Enter access_token generated today"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Generated from your Kite developer dashboard for the current trading day.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Or Generate via Request Token:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Request Token</label>
                    <input
                      type="text"
                      placeholder="token from callback"
                      value={requestToken}
                      onChange={(e) => setRequestToken(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">API Secret</label>
                    <input
                      type="password"
                      placeholder="app api_secret"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleKiteConnectLogin}
                disabled={loading || !apiKey || (!accessToken && (!requestToken || !apiSecret))}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Validating Kite Session...' : 'Connect Kite Connect Live'}
              </button>
            </div>
          )}

          {/* Tab 3: Kite Statement CSV Upload */}
          {tab === 'CSV' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Paste Kite Holdings CSV Statement:
                </label>
                <textarea
                  rows={6}
                  placeholder={`Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg. %,Day chg. %\nINFY,50,1400.00,1380.00,69000.00,-1000.00,-1.43,-0.85\nRELIANCE,30,2400.00,2550.00,76500.00,4500.00,6.25,1.20\nTCS,20,3500.00,3600.00,72000.00,2000.00,2.86,0.40`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Export from <strong>Kite Web &rarr; Holdings &rarr; Download CSV</strong>.
                </p>
              </div>

              <button
                onClick={handleCsvUpload}
                disabled={loading || !csvContent.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Parsing Statement...' : 'Import Kite Statement & Sync Market'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
