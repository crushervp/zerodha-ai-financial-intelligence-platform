'use client';

import React, { useState, useMemo } from 'react';

export interface HoldingItem {
  symbol: string;
  sector: string;
  quantity: number;
  average_price: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  weight_pct: number;
  pnl_contribution_pct?: number;
}

interface HoldingsTableProps {
  holdings: HoldingItem[];
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

  // Compute active counters for instant portfolio health feedback
  const gainersCount = useMemo(() => holdings.filter((h) => h.unrealized_pnl > 0).length, [holdings]);
  const losersCount = useMemo(() => holdings.filter((h) => h.unrealized_pnl < 0).length, [holdings]);
  const totalCount = holdings.length;

  const filteredHoldings = useMemo(() => {
    return holdings.filter((item) => {
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sector.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === 'PROFIT') return item.unrealized_pnl > 0;
      if (filterType === 'LOSS') return item.unrealized_pnl < 0;
      return true;
    });
  }, [holdings, searchTerm, filterType]);

  const totalInvested = useMemo(() => holdings.reduce((sum, h) => sum + h.invested_value, 0), [holdings]);
  const totalCurrent = useMemo(() => holdings.reduce((sum, h) => sum + h.current_value, 0), [holdings]);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Header controls with integrated search and active counter buttons */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Holdings Breakdown ({holdings.length})
            </h3>
            <span className="text-xs bg-orange-50 text-orange-700 font-semibold px-2 py-0.5 rounded-full border border-orange-200">
              Kite Book
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized holding positions with real-time mark-to-market valuations
          </p>
        </div>

        {/* Filter Strip with Active Counters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search stock or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56 shadow-2xs"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400">
              <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                {totalCount}
              </span>
            </button>
            <button
              onClick={() => setFilterType('PROFIT')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                filterType === 'PROFIT'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/60'
              }`}
            >
              <span>Gainers</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                filterType === 'PROFIT' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {gainersCount}
              </span>
            </button>
            <button
              onClick={() => setFilterType('LOSS')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                filterType === 'LOSS'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 hover:text-rose-800 hover:bg-rose-50/60'
              }`}
            >
              <span>Losers</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                filterType === 'LOSS' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {losersCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Table with Strictly Aligned Column Baselines */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
              <th className="py-3 px-4 text-left">Instrument</th>
              <th className="py-3 px-4 text-right">Qty</th>
              <th className="py-3 px-4 text-right">Avg. Cost</th>
              <th className="py-3 px-4 text-right">LTP / CMP</th>
              <th className="py-3 px-4 text-right">Cur. Value</th>
              <th className="py-3 px-4 text-right">P&amp;L (₹ / %)</th>
              <th className="py-3 px-4 text-right">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  No holdings match &ldquo;{searchTerm}&rdquo; with filter: {filterType}.
                </td>
              </tr>
            ) : (
              filteredHoldings.map((item) => {
                const isProfit = item.unrealized_pnl >= 0;
                const pnlPct =
                  item.invested_value > 0 ? (item.unrealized_pnl / item.invested_value) * 100 : 0;

                return (
                  <tr key={item.symbol} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-left">
                      <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                        {item.symbol}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">{item.sector}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-mono">
                      {item.quantity.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                      ₹{item.average_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold font-mono">
                      ₹{item.current_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold font-mono">
                      {formatCurrency(item.current_value)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className={`font-bold text-xs ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(item.unrealized_pnl)}
                      </div>
                      <div className={`text-[10px] font-semibold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* Expanded Weight Progress Bar with Light Track Background */}
                        <div className="w-24 sm:w-28 bg-slate-200/90 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.weight_pct > 35
                                ? 'bg-rose-500'
                                : item.weight_pct > 25
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(item.weight_pct * 2.5, 100)}%` }}
                            title={`${item.symbol}: ${item.weight_pct.toFixed(1)}%`}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800 w-11 text-right text-xs">
                          {item.weight_pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals Row with Distinct Background Tint and Clear Separation */}
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-t-2 border-slate-300 text-xs font-bold text-slate-900 shadow-inner">
              <td className="py-4 px-4 uppercase tracking-wider text-slate-900 font-black">
                Total Portfolio Value
              </td>
              <td className="py-4 px-4 text-right text-slate-600 font-mono">
                {holdings.length} stocks
              </td>
              <td className="py-4 px-4 text-right text-slate-600 font-mono">
                {formatCurrency(totalInvested)}
              </td>
              <td className="py-4 px-4 text-right text-slate-400 font-mono">-</td>
              <td className="py-4 px-4 text-right text-slate-950 font-black font-mono text-sm">
                {formatCurrency(totalCurrent)}
              </td>
              <td className="py-4 px-4 text-right font-mono">
                <span className={`font-black text-sm ${totalPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                </span>
                <span className={`text-xs ml-1.5 font-bold ${totalPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ({totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
                </span>
              </td>
              <td className="py-4 px-4 text-right font-mono text-slate-950 font-black text-xs">
                100.0%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
