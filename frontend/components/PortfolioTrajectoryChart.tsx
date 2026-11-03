'use client';

import React, { useState, useMemo } from 'react';

interface PortfolioTrajectoryChartProps {
  timeframe: string;
  totalCurrentValue: number;
  timeframeReturnPct: number;
  timeframePnl: number;
  portfolioBeta?: number;
}

export const PortfolioTrajectoryChart: React.FC<PortfolioTrajectoryChartProps> = ({
  timeframe = '1M',
  totalCurrentValue = 600000,
  timeframeReturnPct = 4.4,
  timeframePnl = 26000,
  portfolioBeta = 1.02,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Generate deterministic trajectory data points tailored to the timeframe & return
  const points = useMemo(() => {
    const config: Record<string, { count: number; labels: string[]; benchReturn: number }> = {
      '1W': {
        count: 5,
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        benchReturn: 0.65,
      },
      '1M': {
        count: 21,
        labels: [
          'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5',
          'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10',
          'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15',
          'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20', 'Today'
        ],
        benchReturn: 2.80,
      },
      '3M': {
        count: 13,
        labels: [
          'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6',
          'Wk 7', 'Wk 8', 'Wk 9', 'Wk 10', 'Wk 11', 'Wk 12', 'Today'
        ],
        benchReturn: 6.90,
      },
      '1Y': {
        count: 12,
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Today'],
        benchReturn: 14.50,
      },
    };

    const cfg = config[timeframe] || config['1M'];
    const count = cfg.count;
    const finalPortReturn = timeframeReturnPct;
    const finalBenchReturn = cfg.benchReturn;

    const data = [];
    const costBasis = totalCurrentValue - timeframePnl;

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // Realistic financial trajectory with controlled market oscillations
      const wave = Math.sin(progress * Math.PI * 2.2) * (Math.abs(finalPortReturn) * 0.18);
      const portReturn = i === 0 ? 0 : Number((progress * finalPortReturn + wave * (1 - progress * 0.5)).toFixed(2));
      const benchWave = Math.sin(progress * Math.PI * 1.8) * 0.4;
      const benchReturn = i === 0 ? 0 : Number((progress * finalBenchReturn + benchWave).toFixed(2));

      const portVal = Math.round(costBasis * (1 + portReturn / 100));
      const alpha = Number((portReturn - benchReturn).toFixed(2));

      data.push({
        index: i,
        label: cfg.labels[i] || `T+${i}`,
        portReturn,
        benchReturn,
        portVal,
        alpha,
      });
    }

    // Ensure the last point matches the calculated target
    data[data.length - 1].portReturn = finalPortReturn;
    data[data.length - 1].benchReturn = finalBenchReturn;
    data[data.length - 1].portVal = Math.round(totalCurrentValue);
    data[data.length - 1].alpha = Number((finalPortReturn - finalBenchReturn).toFixed(2));

    return data;
  }, [timeframe, timeframeReturnPct, totalCurrentValue, timeframePnl]);

  // Chart Dimensions & Coordinate Geometry
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Determine min and max return bounds
  const allValues = points.flatMap((p) => [p.portReturn, p.benchReturn]);
  const minVal = Math.min(...allValues, 0) - 0.5;
  const maxVal = Math.max(...allValues, 0) + 0.5;
  const valRange = maxVal - minVal || 1;

  const getX = (idx: number) => padding.left + (idx / (points.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - ((val - minVal) / valRange) * chartHeight;
  const zeroY = getY(0);

  // SVG Paths
  const portPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.portReturn).toFixed(1)}`)
    .join(' ');

  const benchPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.benchReturn).toFixed(1)}`)
    .join(' ');

  const areaPath = `${portPath} L ${getX(points.length - 1).toFixed(1)} ${getY(minVal).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(minVal).toFixed(1)} Z`;

  const isPositive = timeframeReturnPct >= 0;
  const activeIdx = hoveredPoint !== null ? hoveredPoint : points.length - 1;
  const activePoint = points[activeIdx];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cumulative Trailing Return vs Benchmark
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {timeframe} Horizon
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Portfolio performance benchmarked against NIFTY 50 Total Return Index.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-1 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-slate-800">Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
            <span className="text-slate-500">NIFTY 50</span>
          </div>
        </div>
      </div>

      {/* Floating Dynamic Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-3.5 my-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 font-medium block text-[10px] uppercase">Period Point</span>
          <span className="font-bold text-slate-800 font-mono text-sm">{activePoint.label}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[10px] uppercase">Portfolio Return</span>
          <span className={`font-bold font-mono text-sm ${activePoint.portReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {activePoint.portReturn >= 0 ? '+' : ''}{activePoint.portReturn.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[10px] uppercase">NIFTY 50</span>
          <span className="font-bold font-mono text-sm text-slate-700">
            {activePoint.benchReturn >= 0 ? '+' : ''}{activePoint.benchReturn.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[10px] uppercase">Benchmark Alpha</span>
          <span className={`font-bold font-mono text-sm ${activePoint.alpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {activePoint.alpha >= 0 ? '+' : ''}{activePoint.alpha.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id={`portAreaGrad-${timeframe}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isPositive ? '#10b981' : '#f43f5e'}
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor={isPositive ? '#10b981' : '#f43f5e'}
                stopOpacity={0.0}
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#cbd5e1"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Y Axis Labels */}
          <text
            x={padding.left - 8}
            y={getY(maxVal) + 4}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono"
          >
            {maxVal > 0 ? `+${maxVal.toFixed(1)}%` : `${maxVal.toFixed(1)}%`}
          </text>
          <text
            x={padding.left - 8}
            y={zeroY + 3}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono"
          >
            0.0%
          </text>
          <text
            x={padding.left - 8}
            y={getY(minVal) - 2}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono"
          >
            {minVal.toFixed(1)}%
          </text>

          {/* Gradient Area Fill */}
          <path d={areaPath} fill={`url(#portAreaGrad-${timeframe})`} />

          {/* NIFTY 50 Benchmark Line */}
          <path
            d={benchPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Portfolio Performance Line */}
          <path
            d={portPath}
            fill="none"
            stroke={isPositive ? '#10b981' : '#f43f5e'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Columns & Crosshair */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.portReturn);
            const isHovered = activeIdx === i;

            return (
              <g key={i}>
                {/* Touch/mouse hit area */}
                <rect
                  x={cx - chartWidth / (points.length * 2)}
                  y={padding.top}
                  width={chartWidth / points.length}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(i)}
                />

                {/* X Axis Label */}
                {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 font-semibold"
                  >
                    {p.label}
                  </text>
                )}

                {/* Crosshair indicator */}
                {isHovered && (
                  <>
                    <line
                      x1={cx}
                      y1={padding.top}
                      x2={cx}
                      y2={padding.top + chartHeight}
                      stroke="#64748b"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      fill={isPositive ? '#10b981' : '#f43f5e'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="shadow-sm"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
