'use client';

import React, { useState } from 'react';

export interface SectorItem {
  sector: string;
  total_value: number;
  weight_pct: number;
  stock_count: number;
  total_pnl: number;
}

interface SectorAllocationProps {
  sectorAnalysis?: {
    sectors?: SectorItem[];
    overweighted_sectors?: string[];
    dominant_sector?: string;
  };
  holdings?: Array<{
    symbol: string;
    sector: string;
    quantity: number;
    current_price: number;
    current_value: number;
    unrealized_pnl: number;
    weight_pct: number;
  }>;
}

const SECTOR_HEX = [
  '#2563eb', // blue
  '#059669', // emerald
  '#4f46e5', // indigo
  '#f59e0b', // amber
  '#9333ea', // purple
  '#e11d48', // rose
  '#0891b2', // cyan
  '#0d9488', // teal
];

export const SectorAllocation: React.FC<SectorAllocationProps> = ({
  sectorAnalysis,
  holdings = [],
}) => {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

  const sectors = sectorAnalysis?.sectors || [];
  const overweighted = sectorAnalysis?.overweighted_sectors || [];

  React.useEffect(() => {
    if (sectors.length > 0 && Object.keys(expandedSectors).length === 0) {
      setExpandedSectors({ [sectors[0].sector]: true });
    }
  }, [sectors]);

  const toggleSectorExpand = (sectorName: string) => {
    setExpandedSectors((prev) => ({
      ...prev,
      [sectorName]: !prev[sectorName],
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
      {/* Header with SEBI 35% Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Sector Exposure &amp; Distribution
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
              {sectors.length} Sectors
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated sector allocations monitored against the SEBI 35% single-sector concentration guideline
          </p>
        </div>

        {overweighted.length > 0 ? (
          <span className="text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5 animate-pulse">
            <span>⚠</span> Sector Breach: {overweighted.join(', ')} (&gt;35%)
          </span>
        ) : (
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span> Within 35% SEBI Guidelines
          </span>
        )}
      </div>

      {/* Stacked Progress Bar with 35% SEBI Reference Line & Tooltips */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-600">Proportional Allocation Bar</span>
          {hoveredSector ? (
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px] animate-fade-in">
              {hoveredSector}: {sectors.find((s) => s.sector === hoveredSector)?.weight_pct.toFixed(1)}% (
              {formatCurrency(sectors.find((s) => s.sector === hoveredSector)?.total_value || 0)})
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Hover segments to highlight constituents</span>
          )}
        </div>

        {/* Bar Container with 35% Reference Marker */}
        <div className="relative pt-4 pb-2">
          {/* Vertical 35% Reference Indicator Line */}
          <div
            className="absolute top-0 bottom-0 z-20 flex flex-col items-center pointer-events-none"
            style={{ left: '35%' }}
          >
            <span className="text-[9px] font-extrabold text-slate-600 bg-white/95 px-1 rounded shadow-2xs border border-slate-300 -translate-y-1">
              ▼ 35% Limit
            </span>
            <div className="w-0.5 h-full border-l-2 border-dashed border-slate-700/80 my-0.5" />
          </div>

          {/* Segmented Stacked Bar */}
          <div className="w-full bg-slate-100 rounded-lg h-3.5 overflow-hidden flex shadow-inner relative">
            {sectors.map((sec, idx) => {
              const colorHex = SECTOR_HEX[idx % SECTOR_HEX.length];
              const isHovered = hoveredSector === sec.sector;

              return (
                <div
                  key={sec.sector}
                  onMouseEnter={() => setHoveredSector(sec.sector)}
                  onMouseLeave={() => setHoveredSector(null)}
                  className={`h-full transition-all duration-200 cursor-pointer relative ${
                    isHovered ? 'brightness-110 shadow-md scale-y-110 z-10' : 'hover:opacity-95'
                  }`}
                  style={{
                    width: `${sec.weight_pct}%`,
                    backgroundColor: colorHex,
                  }}
                  title={`${sec.sector}: ${sec.weight_pct.toFixed(1)}% (${formatCurrency(sec.total_value)})`}
                />
              );
            })}
          </div>

          {/* Bar Scale Footer */}
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono px-0.5">
            <span>0%</span>
            <span className="text-slate-600 font-bold pl-4">35% SEBI Threshold</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Balanced 3-Column Grid Layout with Bar-to-Card Color Synchronization & Stock Drawers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map((sec, idx) => {
          const colorHex = SECTOR_HEX[idx % SECTOR_HEX.length];
          const isOverweight = sec.weight_pct > 35.0;
          const isHovered = hoveredSector === sec.sector;
          const isExpanded = !!expandedSectors[sec.sector];

          // Filter constituent holdings for this sector
          const sectorHoldings = holdings.filter((h) => h.sector === sec.sector);

          return (
            <div
              key={sec.sector}
              onMouseEnter={() => setHoveredSector(sec.sector)}
              onMouseLeave={() => setHoveredSector(null)}
              className={`rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isHovered
                  ? 'bg-white ring-2 ring-blue-500 shadow-md border-transparent scale-[1.01]'
                  : isOverweight
                  ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              {/* Synchronized Color Accent Top Bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: colorHex }} />

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Card Title & Weight */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="text-sm font-bold text-slate-900 truncate" title={sec.sector}>
                        {sec.sector}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {sec.weight_pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Stock Count Affordance (Clickable Drawer Trigger) */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono pb-2 border-b border-slate-100">
                    <button
                      onClick={() => toggleSectorExpand(sec.sector)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline transition"
                      title="Click to view constituent holdings"
                    >
                      <span>
                        {sec.stock_count} {sec.stock_count === 1 ? 'holding' : 'holdings'}
                      </span>
                      <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <span className="font-bold text-slate-800 text-xs">
                      {formatCurrency(sec.total_value)}
                    </span>
                  </div>

                  {/* Collapsible Constituent Stock Drawer */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-1 space-y-1.5 text-xs animate-fade-in">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Constituent Stocks:
                      </span>
                      {sectorHoldings.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No direct stock details</span>
                      ) : (
                        sectorHoldings.map((stock) => {
                          const isProfit = stock.unrealized_pnl >= 0;
                          return (
                            <div
                              key={stock.symbol}
                              className="p-1.5 bg-white rounded border border-slate-200 flex items-center justify-between font-mono text-[11px] shadow-2xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{stock.symbol}</span>
                                <span className="text-[10px] text-slate-400">({stock.quantity} qty)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-700">{formatCurrency(stock.current_value)}</span>
                                <span className={`font-semibold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isProfit ? '+' : ''}{formatCurrency(stock.unrealized_pnl)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Overweight Alert Banner */}
                {isOverweight && (
                  <div className="mt-3 pt-2 border-t border-rose-200 text-[11px] text-rose-700 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>⚠</span> SEBI OVERWEIGHT
                    </span>
                    <span>&gt; 35% Limit</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
