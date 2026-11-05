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
  const [tab, setTab] = useState<'REAL_LOGIN' | 'CSV' | 'KITE_CONNECT' | 'DEMO'>('REAL_LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real Kite Login state
  const [loginMethod, setLoginMethod] = useState<'CREDENTIALS' | 'ENCTOKEN'>('CREDENTIALS');
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [enctoken, setEnctoken] = useState('');

  // Demo state
  const [selectedDemoId, setSelectedDemoId] = useState('ZR1001');

  // Kite Connect API state
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [requestToken, setRequestToken] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  // CSV state
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleRealLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (loginMethod === 'ENCTOKEN') {
        if (!enctoken.trim()) {
          throw new Error('Please paste your Zerodha Kite enctoken.');
        }
        const res = await fetch(`${API_BASE}/api/zerodha/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_type: 'ENCTOKEN',
            enctoken: enctoken.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Kite Enctoken validation failed');
        onLoginSuccess(data.session);
        onClose();
      } else {
        if (!clientId.trim()) {
          throw new Error('Please enter your Zerodha User ID (e.g. AB1234).');
        }
        if (!password) {
          throw new Error('Please enter your Zerodha Kite password.');
        }
        if (!totp.trim()) {
          throw new Error('Please enter the 6-digit App 2FA TOTP code from your authenticator or Kite app.');
        }

        const res = await fetch(`${API_BASE}/api/zerodha/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_type: 'KITE_WEB',
            client_id: clientId.trim().toUpperCase(),
            password: password,
            totp: totp.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Zerodha login failed. Please verify credentials.');
        onLoginSuccess(data.session);
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/zerodha/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_type: 'DEMO',
          client_id: selectedDemoId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo login failed');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCsvUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!csvContent.trim()) throw new Error('Please select or paste your Kite holdings CSV content.');
      const res = await fetch(`${API_BASE}/api/zerodha/upload-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: csvContent,
          client_id: fileName ? fileName.replace(/\.[^/.]+$/, "") : 'KITE_STATEMENT',
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
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-white text-lg shadow-xs">
              K
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Connect Zerodha Account</span>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 font-mono font-semibold px-2 py-0.5 rounded border border-orange-500/40">
                  Live Portfolio
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze your actual holdings with real-time NSE market analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-center">
          <button
            onClick={() => { setTab('REAL_LOGIN'); setError(null); }}
            className={`py-3 px-2 border-b-2 transition cursor-pointer ${
              tab === 'REAL_LOGIN'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kite Login
          </button>
          <button
            onClick={() => { setTab('CSV'); setError(null); }}
            className={`py-3 px-2 border-b-2 transition cursor-pointer ${
              tab === 'CSV'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Statement CSV
          </button>
          <button
            onClick={() => { setTab('KITE_CONNECT'); setError(null); }}
            className={`py-3 px-2 border-b-2 transition cursor-pointer ${
              tab === 'KITE_CONNECT'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kite API Keys
          </button>
          <button
            onClick={() => { setTab('DEMO'); setError(null); }}
            className={`py-3 px-2 border-b-2 transition cursor-pointer ${
              tab === 'DEMO'
                ? 'border-orange-500 text-orange-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Demo Accounts
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-start gap-2">
              <span className="text-sm">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: Real Interactive Kite Login */}
          {tab === 'REAL_LOGIN' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLoginMethod('CREDENTIALS')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    loginMethod === 'CREDENTIALS'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Zerodha User ID &amp; 2FA
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('ENCTOKEN')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    loginMethod === 'ENCTOKEN'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kite Enctoken (No Password)
                </button>
              </div>

              {loginMethod === 'CREDENTIALS' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Zerodha User ID (Client ID):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ZD9981 or AB1234"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Kite Password:
                      </label>
                      <input
                        type="password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        2FA Code / App Code / TOTP:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 056806"
                        value={totp}
                        onChange={(e) => setTotp(e.target.value)}
                        className="w-full text-xs font-mono tracking-widest text-center border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 -mt-2">
                    Enter the 6-digit <strong>App Code</strong> from your Kite mobile app profile or your <strong>Authenticator TOTP</strong>.
                  </p>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed">
                    <strong>🔐 Live Kite Authentication:</strong> Connects directly to Zerodha Kite servers to authenticate your account and fetch your genuine stock holdings. Your password is never stored on disk.
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Paste Kite Enctoken:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Paste your enctoken copied from kite.zerodha.com cookies"
                      value={enctoken}
                      onChange={(e) => setEnctoken(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                    <strong>💡 How to get enctoken:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-0.5 text-slate-500">
                      <li>Log into <strong>kite.zerodha.com</strong> in your browser</li>
                      <li>Press <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[10px]">F12</kbd> &rarr; Application &rarr; Cookies &rarr; kite.zerodha.com</li>
                      <li>Copy the value of the <strong>enctoken</strong> cookie and paste it here</li>
                    </ol>
                  </div>
                </div>
              )}

              <button
                onClick={handleRealLogin}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Authenticating with Zerodha Kite...' : 'Login & Fetch Real Holdings'}
              </button>
            </div>
          )}

          {/* Tab 2: Statement CSV Upload */}
          {tab === 'CSV' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Select Holdings CSV File:
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-orange-500 transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-base">
                      📄
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {fileName ? `Selected: ${fileName}` : 'Click to browse holdings.csv'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Exported from Kite Web (Holdings &rarr; Download CSV) or Zerodha Console
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Or Paste CSV Text Directly:
                </label>
                <textarea
                  rows={4}
                  placeholder={`Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg. %,Day chg. %\nINFY,50,1400.00,1380.00,69000.00,-1000.00,-1.43,-0.85\nRELIANCE,30,2400.00,2550.00,76500.00,4500.00,6.25,1.20`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
                ✔ <strong>100% Private &amp; Safe:</strong> Imports your real portfolio directly without requiring any login credentials, and immediately queries live NSE market quotes for accurate metrics.
              </div>

              <button
                onClick={handleCsvUpload}
                disabled={loading || !csvContent.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Parsing Statement & Querying NSE...' : 'Import Statement & Analyze'}
              </button>
            </div>
          )}

          {/* Tab 3: Kite Connect API */}
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
                  Generated from developers.kite.trade for today's trading session.
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
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Validating Kite Session...' : 'Connect Kite Connect Live'}
              </button>
            </div>
          )}

          {/* Tab 4: Explicit Simulated Demo Accounts */}
          {tab === 'DEMO' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 leading-relaxed">
                ℹ <strong>Simulated Demo Portfolios:</strong> These are pre-loaded sample accounts for testing portfolio analytics and SEBI compliance without connecting your actual Zerodha account.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Choose a Demo Portfolio:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setSelectedDemoId('ZR1001')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedDemoId === 'ZR1001'
                        ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoAccount"
                      checked={selectedDemoId === 'ZR1001'}
                      onChange={() => setSelectedDemoId('ZR1001')}
                      className="mt-1 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Demo Account 1: Rahul Sharma (ZR1001)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        6 Large-cap holdings (RELIANCE, HDFCBANK, INFY, TATAMOTORS, ICICIBANK, TCS)
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setSelectedDemoId('ZR2002')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedDemoId === 'ZR2002'
                        ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoAccount"
                      checked={selectedDemoId === 'ZR2002'}
                      onChange={() => setSelectedDemoId('ZR2002')}
                      className="mt-1 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Demo Account 2: Priya Patel (ZR2002)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Banking concentration (HDFCBANK, ICICIBANK, SBIN, YESBANK, INFY)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Loading Demo Portfolio...' : 'Load Demo Portfolio'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
