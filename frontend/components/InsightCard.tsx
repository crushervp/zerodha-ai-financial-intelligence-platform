'use client';

import React, { useState } from 'react';

interface RecommendationCardProps {
  card: {
    card_id: string;
    category: 'EDUCATIONAL_INSIGHT' | 'RISK_ALERT' | 'RECOMMENDATION_PROMPT';
    title: string;
    summary: string;
    rationale: string;
    supporting_metrics: Record<string, any>;
    confidence: number;
    disclaimer: string;
  };
  onFeedback?: (cardId: string, action: string) => void;
}

export const InsightCard: React.FC<RecommendationCardProps> = ({ card, onFeedback }) => {
  const [expanded, setExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false);

  const handleAction = (action: string) => {
    setFeedbackSent(action);
    if (onFeedback) onFeedback(card.card_id, action);
  };

  const getCardStyle = () => {
    switch (card.category) {
      case 'RISK_ALERT':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          borderLeft: 'border-l-4 border-l-rose-500',
        };
      case 'RECOMMENDATION_PROMPT':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          borderLeft: 'border-l-4 border-l-amber-500',
        };
      default:
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          borderLeft: 'border-l-4 border-l-blue-500',
        };
    }
  };

  const formatKeyName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatMetricValue = (val: any) => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  const cardStyle = getCardStyle();
  const confidencePct = Math.round(card.confidence * 100);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow mb-4 ${cardStyle.borderLeft}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${cardStyle.badge}`}>
          {card.category.replace(/_/g, ' ')}
        </span>

        {/* Explainable Confidence Score with Derived Metric Tooltip */}
        <div className="relative">
          <div
            onMouseEnter={() => setShowConfidenceTooltip(true)}
            onMouseLeave={() => setShowConfidenceTooltip(false)}
            onClick={() => setShowConfidenceTooltip(!showConfidenceTooltip)}
            className="text-xs text-slate-500 font-medium flex items-center gap-1.5 cursor-help bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md transition"
          >
            <span>Confidence:</span>
            <span className="font-bold text-slate-800 font-mono">{confidencePct}%</span>
            <span className="text-[10px] text-blue-600 bg-blue-50 w-3.5 h-3.5 rounded-full inline-flex items-center justify-center font-bold">
              ?
            </span>
          </div>

          {showConfidenceTooltip && (
            <div className="absolute right-0 top-7 z-20 w-64 p-3 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-lg border border-slate-800 leading-relaxed">
              <span className="font-bold text-white block mb-1">
                Explainable AI Confidence ({confidencePct}%):
              </span>
              Derived from 100% complete live NSE market quotes + deterministic mathematical threshold checks (HHI, Beta &amp; Volatility variance).
            </div>
          )}
        </div>
      </div>

      <h4 className="text-base font-bold text-slate-900 mb-1.5">{card.title}</h4>
      <p className="text-sm text-slate-600 mb-3.5 leading-relaxed">{card.summary}</p>

      {/* Expand/Collapse Rationale */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition flex items-center gap-1 mb-2"
      >
        <span>{expanded ? '▲ Hide Rationale & Metrics' : '▼ Inspect Rationale & Supporting Metrics'}</span>
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3">
          <div>
            <div className="font-bold text-slate-900 mb-1">Deterministic Rationale:</div>
            <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
              {card.rationale}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900">Supporting Quantitative Evidence:</span>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[10px] text-slate-500 hover:text-slate-700 underline"
              >
                {showRawJson ? 'View Clean Badges' : 'View Raw JSON'}
              </button>
            </div>

            {showRawJson ? (
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] font-mono">
                {JSON.stringify(card.supporting_metrics, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(card.supporting_metrics || {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs"
                  >
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      {formatKeyName(k)}:
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {formatMetricValue(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 italic border-t border-slate-200 pt-2">
            {card.disclaimer}
          </div>
        </div>
      )}

      {/* Thumbs up / down feedback */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-xs text-slate-500">
        <span>Was this insight helpful?</span>
        <div className="flex items-center gap-2">
          {feedbackSent && (
            <span className="text-[11px] text-emerald-600 font-semibold mr-1 flex items-center gap-1 animate-fade-in">
              <span>✓</span> Thanks for your feedback!
            </span>
          )}
          <button
            onClick={() => handleAction('HELPFUL')}
            disabled={!!feedbackSent}
            className={`px-3 py-1 rounded-lg border font-medium text-xs transition ${
              feedbackSent === 'HELPFUL'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50'
            }`}
          >
            👍 Helpful
          </button>
          <button
            onClick={() => handleAction('NOT_HELPFUL')}
            disabled={!!feedbackSent}
            className={`px-3 py-1 rounded-lg border font-medium text-xs transition ${
              feedbackSent === 'NOT_HELPFUL'
                ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50'
            }`}
          >
            👎 Not Helpful
          </button>
        </div>
      </div>
    </div>
  );
};
