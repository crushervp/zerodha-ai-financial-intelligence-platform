'use client';

import React, { useState } from 'react';

interface WorkflowStatusProps {
  status: string;
}

const STAGES = [
  { key: 'PENDING', label: 'Queued' },
  { key: 'FETCHING_DATA', label: 'Fetching Data' },
  { key: 'RUNNING_ANALYTICS', label: 'Analytics Engine' },
  { key: 'GENERATING_EXPLANATION', label: 'AI Reasoning' },
  { key: 'VALIDATING_OUTPUT', label: 'Compliance Gate' },
  { key: 'COMPLETED', label: 'Ready' },
];

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({ status }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  const isCompleted = status === 'COMPLETED';

  // If completed and not manually expanded, show ultra-compact, high-density badge
  if (isCompleted && !isExpanded) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs mb-5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
            ✓
          </span>
          <span className="font-bold text-slate-800">
            Pipeline Execution Complete
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 hidden sm:inline">
            All 5 deterministic data, analytics &amp; SEBI regulatory compliance checks passed
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition flex items-center gap-1 shrink-0"
        >
          <span>View 5 Audit Steps</span>
          <span className="text-[10px]">▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm mb-5 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span>Pipeline Execution Status:</span>
          <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
            isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {status}
          </span>
        </div>

        {isCompleted && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded hover:bg-slate-100 transition flex items-center gap-1"
          >
            <span>Collapse</span>
            <span className="text-[10px]">▲</span>
          </button>
        )}
      </div>

      {/* Stepper with perfectly centered connecting line */}
      <div className="relative flex items-center justify-between">
        {/* Continuous Connecting Line Centered Behind Badges */}
        <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute top-3.5 left-6 h-0.5 bg-emerald-500 transition-all duration-500 -z-0"
          style={{
            width: isCompleted
              ? 'calc(100% - 3rem)'
              : `calc(${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}% - 1.5rem)`,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx || isCompleted;
          const isCurrent = stage.key === status;

          return (
            <div key={stage.key} className="flex flex-col items-center flex-1 relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                  isDone
                    ? 'bg-emerald-500 text-white ring-4 ring-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                    : 'bg-slate-200 text-slate-500 ring-4 ring-white'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[11px] mt-2 text-center font-medium leading-tight max-w-[80px] sm:max-w-none ${
                  isCurrent ? 'text-blue-600 font-bold' : isDone ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
