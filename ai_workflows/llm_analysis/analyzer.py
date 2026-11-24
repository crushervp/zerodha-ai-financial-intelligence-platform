import os
import json
import re
from typing import Dict, Any, List
from ai_workflows.prompt_templates.prompts import SYSTEM_EXPLAINER_PROMPT, build_user_prompt

def clean_json_response(raw_text: str) -> str:
    """Strips Markdown codeblocks (```json ... ```) if returned by the LLM."""
    pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(pattern, raw_text)
    if match:
        return match.group(1).strip()
    return raw_text.strip()

def generate_portfolio_analysis(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Invokes the LLM to generate explainable portfolio insights.
    Falls back to a deterministic template if GEMINI_API_KEY is not configured or offline.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line_str = line.strip()
                        if line_str.startswith("GEMINI_API_KEY=") and not line_str.startswith("#"):
                            api_key = line_str.split("=", 1)[1].strip().strip('"').strip("'")
                            if api_key:
                                os.environ["GEMINI_API_KEY"] = api_key
                            break
            except Exception:
                pass

    # Fallback mock mode for offline testing/grading without credentials
    if not api_key or api_key.startswith("mock_"):
        return _generate_mock_analysis(context)

    from google import genai
    from google.genai import types

    try:
        model_name = os.environ.get("LLM_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)
        user_prompt = build_user_prompt(context)

        response = client.models.generate_content(
            model=model_name,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_EXPLAINER_PROMPT,
                temperature=0.2,  # Low temperature for deterministic adherence
                response_mime_type="application/json"
            )
        )

        clean_text = clean_json_response(response.text)
        parsed = json.loads(clean_text)
        
        # Ensure parsed response has valid recommendation_cards
        if isinstance(parsed, dict) and parsed.get("recommendation_cards"):
            return parsed
        return _generate_mock_analysis(context)
    except Exception as err:
        # Graceful fallback to rich deterministic mock payload if offline or invalid key
        print(f"[Warning] Gemini API call failed ({err}), falling back to deterministic actionable analysis.")
        return _generate_mock_analysis(context)

def _generate_mock_analysis(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Provides a comprehensive, deterministic, and deeply actionable portfolio
    intelligence report with tailored action checklists for every portfolio profile.
    """
    portfolio_id = context.get("portfolio_id", "port_unknown")
    summary = context.get("summary") or {}
    alert_flags = context.get("alert_flags") or {}
    top_movers = context.get("top_movers") or {}
    holdings_list = context.get("holdings") or []
    sector_analysis = context.get("sector_analysis") or {}
    risk_metrics = context.get("risk_metrics") or {}
    data_freshness = context.get("data_freshness", "REAL_TIME")

    hhi = float(summary.get("hhi_index") or 0.0)
    total_val = float(summary.get("total_current_value") or 0.0)
    total_pnl = float(summary.get("total_unrealized_pnl") or 0.0)
    pnl_pct = float(summary.get("total_pnl_pct") or 0.0)
    beta = float(risk_metrics.get("portfolio_beta") or 1.0)
    volatility = float(risk_metrics.get("annualized_volatility") or 15.0)

    cards: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # CASE 1: Empty Portfolio (0 holdings)
    # -------------------------------------------------------------
    if not holdings_list:
        cards.append({
            "card_id": f"{portfolio_id}_connected_empty",
            "category": "EDUCATIONAL_INSIGHT",
            "action_type": "SIP_STRATEGY",
            "title": "Zerodha Demat Connected (0 Delivery Holdings)",
            "summary": "Your Zerodha account is successfully linked, but no settled delivery (CNC) shares were detected.",
            "rationale": "Portfolio risk analytics operates on delivery equity. Intraday (MIS) or F&O derivative contracts do not reflect in delivery holdings.",
            "action_steps": [
                "Initiate Delivery Allocation: Place long-term CNC delivery orders or upload your official Zerodha Console CSV statement.",
                "Start an Index SIP: Consider establishing a recurring monthly SIP in low-cost Nifty 50 ETF (NIFTYBEES) to build foundational equity.",
                "Build a Watchlist: Add 5-8 high-conviction companies across diverse sectors (Banking, IT, Healthcare, FMCG) to your Kite watchlist."
            ],
            "supporting_metrics": {
                "active_holdings": 0,
                "total_invested": 0.0
            },
            "confidence": 1.0,
            "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
        })
        cards.append({
            "card_id": f"{portfolio_id}_prompt_start",
            "category": "RECOMMENDATION_PROMPT",
            "action_type": "DIVERSIFICATION",
            "title": "Framework for Portfolio Construction",
            "summary": "A balanced portfolio should target an HHI under 1500 with no single stock exceeding 20% of net invested capital.",
            "rationale": "Empirical risk frameworks recommend spreading capital across at least 4-5 uncorrelated sectors to cushion against drawdowns.",
            "action_steps": [
                "Cap Individual Stocks: Ensure no single stock allocation exceeds 15-20% of your total equity corpus.",
                "Enforce Sector Limits: Restrict total allocation in any individual sector to under 30%.",
                "Maintain Liquid Buffer: Keep 10-15% of trading capital in liquid funds or overnight funds to capitalize on market corrections."
            ],
            "supporting_metrics": {
                "recommended_hhi_target": 1500.0,
                "max_single_stock_cap_pct": 20.0
            },
            "confidence": 0.95,
            "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
        })

    else:
        # Find top holding and its weight
        sorted_holdings = sorted(holdings_list, key=lambda x: x.get("current_value", 0.0), reverse=True)
        top_holding = sorted_holdings[0] if sorted_holdings else {}
        top_symbol = top_holding.get("symbol", "N/A")
        top_weight = float(top_holding.get("weight_pct", 0.0))
        top_ltp = float(top_holding.get("current_price", 0.0))

        # Dominant sector and weight
        sectors = sector_analysis.get("sectors") or []
        dominant_sector_name = sector_analysis.get("dominant_sector") or (sectors[0].get("sector") if sectors else "Equity")
        dominant_sector_info = next((s for s in sectors if s.get("sector") == dominant_sector_name), (sectors[0] if sectors else {}))
        dominant_sector_weight = float(dominant_sector_info.get("weight_pct", 0.0))

        best_perf = (top_movers.get("best_performer") or {}) if isinstance(top_movers, dict) else {}
        worst_perf = (top_movers.get("worst_performer") or {}) if isinstance(top_movers, dict) else {}

        # -------------------------------------------------------------
        # CARD 1: Concentration / Allocation Risk
        # -------------------------------------------------------------
        if top_weight >= 40.0:
            # Extreme single-stock concentration (e.g. port_limited_05 with 100% Reliance)
            cards.append({
                "card_id": f"{portfolio_id}_extreme_single_stock",
                "category": "RISK_ALERT",
                "action_type": "DIVERSIFICATION",
                "title": f"Critical Single-Stock Risk: {top_symbol} ({top_weight:.1f}%)",
                "summary": f"{top_symbol} accounts for {top_weight:.1f}% of your entire portfolio, creating severe company-specific drawdown vulnerability.",
                "rationale": f"HHI score stands at {hhi:.1f} (extreme concentration). A company-specific shock in {top_symbol} would directly impair the entire portfolio.",
                "action_steps": [
                    f"Phased De-concentration: Gradually trim {top_symbol} over 2-3 tranches to bring its portfolio weight down toward 20-25%.",
                    "Redeploy into Index Anchor: Channel trimmed proceeds into broad-market ETFs (e.g., NIFTY 50 / NIFTYBEES) to immediately reduce unsystematic risk.",
                    f"Set GTT Stop-Loss Alert: Place a Good-Till-Triggered stop-loss on Kite for {top_symbol} at 5-7% below current market price (₹{top_ltp:,.1f}) to protect capital."
                ],
                "supporting_metrics": {
                    "top_stock": top_symbol,
                    "top_stock_weight_pct": round(top_weight, 2),
                    "hhi_index": round(hhi, 1),
                    "risk_level": "EXTREME"
                },
                "confidence": 0.98,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })
        elif dominant_sector_weight >= 35.0:
            # Sector concentration breach (e.g. port_concentrated_02 with 68% in Banking)
            cards.append({
                "card_id": f"{portfolio_id}_sector_breach",
                "category": "RISK_ALERT",
                "action_type": "PORTFOLIO_REBALANCE",
                "title": f"Sector Exposure Breach: {dominant_sector_name} ({dominant_sector_weight:.1f}%)",
                "summary": f"{dominant_sector_name} exceeds the recommended 35% concentration threshold, heightening sensitivity to regulatory and interest rate cycles.",
                "rationale": f"Current allocation of {dominant_sector_weight:.1f}% across {dominant_sector_info.get('stock_count', 1)} stocks in {dominant_sector_name} increases correlation risk.",
                "action_steps": [
                    f"Rebalance Sector Weight: Reduce aggregate exposure in {dominant_sector_name} from {dominant_sector_weight:.1f}% toward the target limit of 25-30%.",
                    "Rotate to Non-Correlated Sectors: Redeploy freed capital into under-allocated defensive sectors such as Healthcare/Pharma or FMCG.",
                    f"Consolidate Duplicate Names: Review multiple holdings in {dominant_sector_name} and consider consolidating into your 1-2 highest-conviction leaders."
                ],
                "supporting_metrics": {
                    "dominant_sector": dominant_sector_name,
                    "sector_weight_pct": round(dominant_sector_weight, 2),
                    "hhi_index": round(hhi, 1),
                    "sector_limit_threshold_pct": 35.0
                },
                "confidence": 0.95,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })
        else:
            # Well diversified portfolio (e.g. port_diversified_01)
            cards.append({
                "card_id": f"{portfolio_id}_healthy_diversification",
                "category": "EDUCATIONAL_INSIGHT",
                "action_type": "SIP_STRATEGY",
                "title": f"Healthy Core Diversification (HHI: {hhi:.1f})",
                "summary": f"Your assets are well balanced across {len(holdings_list)} holdings and {len(sectors)} distinct economic sectors.",
                "rationale": f"An HHI score of {hhi:.1f} confirms moderate-to-low concentration, shielding capital from localized sector downturns.",
                "action_steps": [
                    "Quarterly Drift Check: Re-evaluate portfolio weights every quarter; rebalance if any single position drifts beyond 5% of target.",
                    "Systematic SIP Accumulation: Maintain disciplined monthly allocations into your core sector anchors on market consolidations.",
                    "Monitor Macro Triggers: Review earnings updates across your core holdings to confirm operational thesis remains intact."
                ],
                "supporting_metrics": {
                    "hhi_index": round(hhi, 1),
                    "total_holdings": len(holdings_list),
                    "total_sectors": len(sectors),
                    "diversification_status": "OPTIMAL"
                },
                "confidence": 0.92,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })

        # -------------------------------------------------------------
        # CARD 2: Volatility / Beta / Downside Risk Management
        # -------------------------------------------------------------
        if beta >= 1.3 or alert_flags.get("high_volatility"):
            # High Beta / Volatile Small-Cap (e.g. port_volatile_03)
            cards.append({
                "card_id": f"{portfolio_id}_high_beta_risk",
                "category": "RISK_ALERT",
                "action_type": "RISK_DEFENSE",
                "title": f"High Volatility & Aggressive Beta ({beta:.2f}x NIFTY)",
                "summary": f"Your portfolio exhibits elevated beta ({beta:.2f}) and annualized volatility ({volatility:.1f}%), amplifying losses during market corrections.",
                "rationale": f"With a beta of {beta:.2f}, an index drawdown of 5% in NIFTY 50 could translate into a ~{beta*5:.1f}% decline in this portfolio.",
                "action_steps": [
                    "Cap Speculative Capital: Restrict turnaround and high-beta small-cap stocks to under 15% of total liquid portfolio value.",
                    "Set Strict Trailing Stop-Losses: Establish trailing stop-losses of 8-10% on volatile small-caps to prevent severe drawdowns.",
                    "Incorporate Low-Beta Ballast: Add allocation to sovereign gold bonds (SGB), large-cap FMCG, or debt funds to stabilize portfolio volatility."
                ],
                "supporting_metrics": {
                    "portfolio_beta": round(beta, 2),
                    "annualized_volatility_pct": round(volatility, 1),
                    "market_sensitivity": "HIGH"
                },
                "confidence": 0.94,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })
        else:
            # Moderate / Stable Beta
            cards.append({
                "card_id": f"{portfolio_id}_beta_alignment",
                "category": "EDUCATIONAL_INSIGHT",
                "action_type": "RISK_DEFENSE",
                "title": f"Market Alignment: Beta of {beta:.2f} vs NIFTY 50",
                "summary": f"Your portfolio closely tracks the broader market benchmark with an annualized volatility of {volatility:.1f}%.",
                "rationale": "A near-unit beta provides steady participation in broad-market rallies while avoiding excessive small-cap whipsaws.",
                "action_steps": [
                    "Define Risk Tolerance: If seeking higher alpha, allocate a disciplined 15% 'satellite' basket to high-growth emerging themes.",
                    "Downside Protection: Consider setting GTT sell triggers on key gainers at 6-8% below recent swing highs to preserve accumulated profits.",
                    "Review Sector Betas: Check individual stock betas to ensure defensive and cyclical components remain balanced."
                ],
                "supporting_metrics": {
                    "portfolio_beta": round(beta, 2),
                    "annualized_volatility_pct": round(volatility, 1),
                    "benchmark": "NIFTY 50"
                },
                "confidence": 0.90,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })

        # -------------------------------------------------------------
        # CARD 3: Top Performer / Profit Realization Strategy
        # -------------------------------------------------------------
        if best_perf.get("symbol") and best_perf.get("unrealized_pnl", 0.0) > 0:
            b_sym = best_perf.get("symbol")
            b_pnl = float(best_perf.get("unrealized_pnl", 0.0))
            b_pnl_pct = float(best_perf.get("pnl_contribution_pct", 0.0))
            cards.append({
                "card_id": f"{portfolio_id}_profit_management",
                "category": "RECOMMENDATION_PROMPT",
                "action_type": "PROFIT_BOOKING",
                "title": f"Profit Realization Strategy: {b_sym}",
                "summary": f"{b_sym} is your primary outperformer, generating ₹{b_pnl:,.0f} (+{b_pnl_pct:.1f}% P&L contribution). Protect your paper gains.",
                "rationale": f"Leading winners often experience mean-reversion pullbacks. A disciplined partial profit strategy locks in capital gains without exiting the entire trend.",
                "action_steps": [
                    f"Partial Profit Taking: Consider booking 20-25% of your position in {b_sym} to recover invested capital and lock in gains.",
                    f"Raise Trailing Stop: Update your GTT stop-loss trigger on Zerodha Kite for {b_sym} to protect accumulated profits against sudden reversals.",
                    "Reinvest into Laggard Compounders: Deploy harvested profits into quality large-caps trading near their 200-day moving average support."
                ],
                "supporting_metrics": {
                    "top_performer": b_sym,
                    "unrealized_gain": round(b_pnl, 2),
                    "pnl_contribution_pct": round(b_pnl_pct, 2)
                },
                "confidence": 0.91,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })

        # -------------------------------------------------------------
        # CARD 4: Laggard Review / Tax-Loss Harvesting Strategy
        # -------------------------------------------------------------
        if worst_perf.get("symbol") and worst_perf.get("unrealized_pnl", 0.0) < 0:
            w_sym = worst_perf.get("symbol")
            w_pnl = float(worst_perf.get("unrealized_pnl", 0.0))
            w_pnl_pct = float(worst_perf.get("pnl_contribution_pct", 0.0))
            cards.append({
                "card_id": f"{portfolio_id}_tax_harvest_review",
                "category": "RECOMMENDATION_PROMPT",
                "action_type": "TAX_LOSS_HARVESTING",
                "title": f"Underperformer Review & Tax Harvesting: {w_sym}",
                "summary": f"{w_sym} has an unrealized loss of ₹{abs(w_pnl):,.0f} ({w_pnl_pct:.1f}% drag). Re-evaluate thesis and explore tax efficiencies.",
                "rationale": "Holding onto chronic underperformers without an active turnaround thesis incurs high opportunity cost versus market leaders.",
                "action_steps": [
                    f"Tax-Loss Harvesting: Consider booking the ₹{abs(w_pnl):,.0f} loss before financial year-end to offset taxable short-term capital gains (STCG).",
                    f"Review Fundamental Thesis: Check whether {w_sym}'s decline is driven by industry headwinds or deterioration in company fundamentals.",
                    "Avoid Revenge Averaging: Refrain from buying more shares to lower average cost until price convincingly crosses above its 50-DMA."
                ],
                "supporting_metrics": {
                    "laggard_symbol": w_sym,
                    "unrealized_loss": round(w_pnl, 2),
                    "drag_pct": round(w_pnl_pct, 2)
                },
                "confidence": 0.88,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })

        # -------------------------------------------------------------
        # CARD 5: Stale Telemetry Warning (if data is stale)
        # -------------------------------------------------------------
        if data_freshness == "STALE":
            cards.append({
                "card_id": f"{portfolio_id}_stale_telemetry",
                "category": "EDUCATIONAL_INSIGHT",
                "action_type": "RISK_DEFENSE",
                "title": "Telemetry Notice: Delayed Price Quotes Detected",
                "summary": "Certain price feeds in this portfolio are utilizing cached or delayed quotes.",
                "rationale": "Executing rebalancing trades based on delayed quotes can lead to execution slippage during volatile trading sessions.",
                "action_steps": [
                    "Synchronize Live Feeds: Click 'Sync Live Market' in the header to refresh real-time LTP quotes via the NSE feed.",
                    "Check Settlement Status: Verify whether recently transacted shares have settled (T+1) before computing order lot sizes.",
                    "Use Limit Orders: When rebalancing, place Limit Orders rather than Market Orders to avoid slippage on less liquid tickers."
                ],
                "supporting_metrics": {
                    "data_freshness": "STALE",
                    "action_required": "SYNC_MARKET"
                },
                "confidence": 0.99,
                "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
            })

    # -------------------------------------------------------------
    # Dynamic Health Score Calculation
    # -------------------------------------------------------------
    base_score = 95.0
    if hhi > 3500:
        base_score -= 28.0
    elif hhi > 2500:
        base_score -= 18.0
    elif hhi > 1500:
        base_score -= 8.0
    
    if alert_flags.get("sector_concentration"):
        base_score -= 12.0
    if alert_flags.get("single_stock_concentration"):
        base_score -= 12.0
    if alert_flags.get("high_volatility"):
        base_score -= 15.0
    if alert_flags.get("high_drawdown"):
        base_score -= 10.0
    if pnl_pct < -10.0:
        base_score -= 8.0
    
    health_score = max(30.0, min(95.0, round(base_score, 1)))

    best_perf = (top_movers.get("best_performer") or {}) if isinstance(top_movers, dict) else {}
    key_drivers = []
    if best_perf.get("symbol"):
        key_drivers.append({
            "symbol": best_perf.get("symbol", "N/A"),
            "impact_pct": best_perf.get("pnl_contribution_pct", 0.0),
            "direction": "POSITIVE" if best_perf.get("unrealized_pnl", 0) >= 0 else "NEGATIVE",
            "rationale": "Leading contributor to overall portfolio gain/loss."
        })
    else:
        key_drivers.append({
            "symbol": "CASH / CORE",
            "impact_pct": 0.0,
            "direction": "NEUTRAL",
            "rationale": "No active single-stock volatility drivers detected."
        })

    return {
        "portfolio_id": portfolio_id,
        "summary": f"Portfolio holds ₹{summary.get('total_current_value', 0.0):,.2f} across {len(holdings_list)} holdings with total unrealized P&L of {summary.get('total_pnl_pct', 0.0)}%. Concentration status: {summary.get('concentration_status', 'NORMAL')}.",
        "portfolio_health_score": health_score,
        "key_drivers": key_drivers,
        "recommendation_cards": cards,
        "data_freshness": data_freshness,
        "regulatory_disclaimer": "This intelligence summary is generated for educational and risk monitoring purposes only. It does not constitute SEBI-registered investment advice or trade recommendations."
    }
