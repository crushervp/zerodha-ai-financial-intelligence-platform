'use client';

import React from 'react';

interface RiskPanelProps {
  metrics?: {
    portfolio_beta?: number;
    annualized_volatility?: number;
    max_drawdown?: number;
    timeframe?: string;
  };
  hhiIndex?: number;
  concentrationStatus?: string;
  timeframe?: string;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  metrics = {},
  hhiIndex = 0,
  concentrationStatus = 'DIVERSIFIED',
  timeframe = '1M',
}) => {
  const beta = metrics.portfolio_beta ?? 1.0;
  const vol = metrics.annualized_volatility ?? 0.0;
  const mdd = metrics.max_drawdown ?? 0.0;
  const activeTf = metrics.timeframe || timeframe || '1M';

  const getStatusBadge = () => {
    switch (concentrationStatus) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getBetaDescription = (b: number) => {
    if (b > 1.15) return 'High sensitivity to market swings';
    if (b < 0.85) return 'Defensive relative to NIFTY 50';
    return 'Moderate correlation with NIFTY 50';
  };

  const getVolDescription = (v: number) => {
    if (v > 25) return 'Elevated annualized volatility';
    if (v > 18) return 'Moderate price variance';
    return 'Stable large-cap volatility profile';
  };

  // Calculate HHI gauge needle position (0 to 3500 max range)
  const hhiPercentage = Math.min(100, Math.max(0, (hhiIndex / 3500) * 100));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Risk &amp; Quantitative Exposure Matrix
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {activeTf} Horizon
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic quantitative metrics computed via Python (pandas/NumPy). Zero LLM arithmetic.
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono font-bold border border-slate-200">
          NIFTY 50 Benchmark
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. HHI Concentration with Micro-Visual Gauge */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                HHI Concentration
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge()}`}>
                {concentrationStatus}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {hhiIndex.toFixed(1)}
            </div>
          </div>

          {/* Micro-Visual Gauge Bar */}
          <div className="mt-3">
            <div className="relative h-2 rounded-full overflow-hidden flex bg-slate-200">
              {/* <1500 (42.8% of 3500) */}
              <div className="w-[43%] bg-emerald-400" title="Diversified (0-1500)" />
              {/* 1500-2500 (28.6% of 3500) */}
              <div className="w-[29%] bg-amber-400" title="Moderate (1500-2500)" />
              {/* >2500 (28.6% of 3500) */}
              <div className="w-[28%] bg-rose-400" title="High (>2500)" />
            </div>

            {/* Current Position Marker Indicator */}
            <div className="relative w-full h-1 mt-0.5">
              <div
                className="absolute -top-3 w-2 h-2 rounded-full bg-slate-900 border-2 border-white shadow-xs -translate-x-1/2"
                style={{ left: `${hhiPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>0 (Bal.)</span>
              <span>1500</span>
              <span>2500</span>
              <span>3500+</span>
            </div>
          </div>
        </div>

        {/* 2. Portfolio Beta with Explicit NIFTY 50 Labeling */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Portfolio Beta
              </span>
              <span className="text-[10px] bg-slate-200/80 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded">
                β vs NIFTY 50
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {beta.toFixed(2)}
            </div>
          </div>

          <div className="mt-3">
            {/* Beta sensitivity indicator bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  beta > 1.15 ? 'bg-amber-500' : beta < 0.85 ? 'bg-blue-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (beta / 1.6) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              {getBetaDescription(beta)}
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Measured vs NIFTY 50 Index (30-Day Rolling Benchmark)
            </span>
          </div>
        </div>

        {/* 3. Annualized Volatility with Horizon Badge */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Annualized Volatility
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                {activeTf}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {vol.toFixed(1)}%
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  vol > 25 ? 'bg-rose-500' : vol > 18 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (vol / 40) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              {getVolDescription(vol)}
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Standard deviation annualized via 252 trading days
            </span>
          </div>
        </div>

        {/* 4. Max Drawdown */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Max Drawdown
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                {activeTf}
              </span>
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">
              {mdd.toFixed(1)}%
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${Math.min(100, (Math.abs(mdd) / 25) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              Historical peak-to-trough decline
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Maximum observed capital reduction in period
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
