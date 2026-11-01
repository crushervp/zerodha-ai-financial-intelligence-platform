from datetime import datetime, timezone
from typing import Dict, Any
import numpy as np

from .exposure_metrics import compute_holdings_exposure
from .sector_analysis import compute_sector_distribution
from .risk_alerts import evaluate_risk_metrics
from .benchmark_comparison import compare_with_benchmark

def run_analytics_engine(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Master runner for Phase 2 Deterministic Analytics.
    Validates input, runs all calculations, and returns an auditable summary payload.
    """
    portfolio_id = payload.get("portfolio_id", "unknown_portfolio")
    holdings_data = payload.get("holdings", [])
    historical_returns = payload.get("historical_returns", {})
    benchmark_name = payload.get("benchmark_symbol", "NIFTY 50")

    # 1. Compute Holdings & P&L exposure
    exposure = compute_holdings_exposure(holdings_data)

    # 2. Sector Distribution
    sector_results = compute_sector_distribution(exposure["holdings"])

    # 3. Risk & Volatility Metrics
    risk_results = evaluate_risk_metrics(exposure["holdings"], historical_returns)
    
    # Update sector concentration flag in risk alerts
    has_sector_breach = len(sector_results["overweighted_sectors"]) > 0
    risk_results["alert_flags"]["sector_concentration"] = has_sector_breach

    # 4. Benchmark Comparison
    if historical_returns and "holdings" in historical_returns and "benchmark" in historical_returns:
        symbols = [h["symbol"] for h in exposure["holdings"]]
        weights = np.array([h["weight_pct"] / 100.0 for h in exposure["holdings"]])
        import pandas as pd
        holding_df = pd.DataFrame(historical_returns["holdings"])[symbols]
        port_daily = holding_df.dot(weights).values
        bench_daily = np.array(historical_returns["benchmark"])
        bench_results = compare_with_benchmark(port_daily, bench_daily, benchmark_name)
    else:
        bench_results = compare_with_benchmark(np.array([]), np.array([]), benchmark_name)

    # Top contributors & top movers
    sorted_by_weight = sorted(exposure["holdings"], key=lambda x: x["weight_pct"], reverse=True)
    sorted_by_pnl = sorted(exposure["holdings"], key=lambda x: x["unrealized_pnl"], reverse=True)

    return {
        "portfolio_id": portfolio_id,
        "as_of_timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_invested": exposure["total_invested"],
            "total_current_value": exposure["total_current_value"],
            "total_unrealized_pnl": exposure["total_unrealized_pnl"],
            "total_pnl_pct": exposure["total_pnl_pct"],
            "hhi_index": exposure["hhi_index"],
            "concentration_status": exposure["concentration_status"]
        },
        "holdings_breakdown": exposure["holdings"],
        "top_holdings": sorted_by_weight[:3],
        "top_movers": {
            "best_performer": sorted_by_pnl[0] if sorted_by_pnl else None,
            "worst_performer": sorted_by_pnl[-1] if sorted_by_pnl else None
        },
        "sector_analysis": sector_results,
        "risk_metrics": {
            "portfolio_beta": risk_results["portfolio_beta"],
            "annualized_volatility": risk_results["annualized_volatility"],
            "max_drawdown": risk_results["max_drawdown"]
        },
        "benchmark_comparison": bench_results,
        "alert_flags": risk_results["alert_flags"]
    }