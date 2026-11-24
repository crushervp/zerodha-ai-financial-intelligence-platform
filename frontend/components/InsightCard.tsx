'use client';

import React, { useState } from 'react';

interface RecommendationCardProps {
  card: {
    card_id: string;
    category: 'EDUCATIONAL_INSIGHT' | 'RISK_ALERT' | 'RECOMMENDATION_PROMPT';
    action_type?: string;
    title: string;
    summary: string;
    rationale: string;
    action_steps?: string[];
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
  const [copiedAction, setCopiedAction] = useState(false);

  const handleAction = (action: string) => {
    setFeedbackSent(action);
    if (onFeedback) onFeedback(card.card_id, action);
  };

  const copyActionPlan = () => {
    if (!card.action_steps || card.action_steps.length === 0) return;
    const text = `${card.title}\n${card.summary}\n\nRecommended Action Steps:\n` +
      card.action_steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAction(true);
    setTimeout(() => setCopiedAction(false), 2000);
  };

  const getCardStyle = () => {
    switch (card.category) {
      case 'RISK_ALERT':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          borderLeft: 'border-l-4 border-l-rose-500',
          actionHeader: 'text-rose-900',
          actionStepBg: 'border-rose-100 hover:border-rose-200',
        };
      case 'RECOMMENDATION_PROMPT':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          borderLeft: 'border-l-4 border-l-amber-500',
          actionHeader: 'text-amber-900',
          actionStepBg: 'border-amber-100 hover:border-amber-200',
        };
      default:
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          borderLeft: 'border-l-4 border-l-blue-500',
          actionHeader: 'text-blue-900',
          actionStepBg: 'border-blue-100 hover:border-blue-200',
        };
    }
  };

  const getActionTypeLabel = (type?: string) => {
    switch (type) {
      case 'PORTFOLIO_REBALANCE':
        return { label: '⚖️ Rebalance Strategy', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'PROFIT_BOOKING':
        return { label: '💰 Profit Realization', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'RISK_DEFENSE':
        return { label: '🛡️ Downside Defense', style: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'DIVERSIFICATION':
        return { label: '🌐 Diversification Plan', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'TAX_LOSS_HARVESTING':
        return { label: '📉 Tax-Loss Harvest', style: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SIP_STRATEGY':
        return { label: '📈 Systematic Allocation', style: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return null;
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
  const actionTypeBadge = getActionTypeLabel(card.action_type);
  const confidencePct = Math.round(card.confidence * 100);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow mb-4 ${cardStyle.borderLeft}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${cardStyle.badge}`}>
            {card.category.replace(/_/g, ' ')}
          </span>
          {actionTypeBadge && (
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${actionTypeBadge.style}`}>
              {actionTypeBadge.label}
            </span>
          )}
        </div>

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

      {/* Concrete Actionable Steps Checklist */}
      {card.action_steps && card.action_steps.length > 0 && (
        <div className="mt-2 mb-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px] shadow-2xs font-mono font-bold">
                ⚡
              </span>
              <span className="uppercase tracking-wider text-[11px]">Recommended Action Steps</span>
            </div>
            <button
              onClick={copyActionPlan}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded hover:bg-blue-50 transition cursor-pointer"
            >
              {copiedAction ? '✓ Copied!' : '📋 Copy Actions'}
            </button>
          </div>
          <ul className="space-y-2">
            {card.action_steps.map((step, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-800 flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
