'use client';

import React, { useState } from 'react';

interface SectorItem {
  sector: string;
  weight_pct: number;
  total_value?: number;
  stock_count?: number;
}

interface SectorDonutChartProps {
  sectorAnalysis?: {
    sectors?: SectorItem[];
    overweighted_sectors?: string[];
    dominant_sector?: string;
  };
  holdings?: Array<{
    symbol: string;
    sector: string;
    current_value: number;
    weight_pct: number;
  }>;
}

const SECTOR_COLORS = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#eab308', // yellow-500
  '#64748b', // slate-500
];

export const SectorDonutChart: React.FC<SectorDonutChartProps> = ({
  sectorAnalysis = {},
  holdings = [],
}) => {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  const rawSectors = sectorAnalysis.sectors || [];
  const overweighted = sectorAnalysis.overweighted_sectors || [];

  // Sort sectors by weight descending
  const sectors: SectorItem[] = [...rawSectors].sort((a, b) => b.weight_pct - a.weight_pct);

  // Donut Geometry (center at 90, 90; radius = 68; innerRadius = 42)
  const cx = 90;
  const cy = 90;
  const radius = 68;
  const innerRadius = 42;

  let cumulativeAngle = -Math.PI / 2; // Start from 12 o'clock

  const slices = sectors.map((sec, idx) => {
    const angle = (sec.weight_pct / 100) * (2 * Math.PI);
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const isHovered = hoveredSector === sec.sector;
    const r = isHovered ? radius + 4 : radius;
    const ir = isHovered ? innerRadius - 2 : innerRadius;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const ix1 = cx + ir * Math.cos(endAngle);
    const iy1 = cy + ir * Math.sin(endAngle);
    const ix2 = cx + ir * Math.cos(startAngle);
    const iy2 = cy + ir * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2}
      Z
    `;

    return {
      ...sec,
      pathData,
      color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
      isBreach: sec.weight_pct > 35,
    };
  });

  const activeSector = sectors.find((s) => s.sector === hoveredSector) || sectors[0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Asset &amp; Sector Allocation
            </h3>
            {overweighted.length > 0 && (
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                &gt;35% Breach
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Proportional sector exposure across active holdings.
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono font-bold border border-slate-200">
          35% Limit
        </span>
      </div>

      {/* SVG Donut Centered */}
      <div className="relative shrink-0 select-none flex items-center justify-center my-1">
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="cursor-pointer"
          onMouseLeave={() => setHoveredSector(null)}
        >
          {/* Slices */}
          {slices.map((slice) => (
            <path
              key={slice.sector}
              d={slice.pathData}
              fill={slice.color}
              stroke="#ffffff"
              strokeWidth="2"
              className="transition-all duration-200 hover:opacity-90"
              onMouseEnter={() => setHoveredSector(slice.sector)}
            />
          ))}

          {/* Center Donut Label */}
          <circle cx={cx} cy={cy} r={innerRadius - 4} fill="#ffffff" />
          <text
            x={cx}
            y={cy - 7}
            textAnchor="middle"
            className="text-[9px] fill-slate-400 uppercase tracking-wider font-semibold"
          >
            {hoveredSector ? 'Selected' : 'Top Sector'}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            className="text-sm font-black fill-slate-900 font-mono"
          >
            {activeSector ? `${activeSector.weight_pct.toFixed(1)}%` : '0%'}
          </text>
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            className="text-[10px] font-semibold fill-slate-600"
          >
            {activeSector ? activeSector.sector.split(' ')[0] : ''}
          </text>
        </svg>
      </div>

      {/* Breakdown Legend List */}
      <div className="w-full space-y-1.5 max-h-44 overflow-y-auto pr-1 mt-2">
        {slices.map((slice) => {
          const isHovered = hoveredSector === slice.sector;
          return (
            <div
              key={slice.sector}
              onMouseEnter={() => setHoveredSector(slice.sector)}
              onMouseLeave={() => setHoveredSector(null)}
              className={`px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center justify-between text-xs ${
                isHovered
                  ? 'bg-slate-100 border-slate-300 shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-semibold text-slate-800 truncate">
                  {slice.sector}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-bold text-slate-900 font-mono">
                  {slice.weight_pct.toFixed(1)}%
                </span>
                {slice.isBreach && (
                  <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                    Breach
                  </span>
                )}
                {slice.total_value !== undefined && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {formatCurrency(slice.total_value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
