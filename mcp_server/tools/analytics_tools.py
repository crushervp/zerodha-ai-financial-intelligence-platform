from typing import Dict, Any
from backend.analytics.engine import run_analytics_engine
from .portfolio_tools import get_portfolio_snapshot
from .market_tools import fetch_market_data

def execute_risk_analytics(portfolio_id: str, timeframe: str = "1M") -> Dict[str, Any]:
    """Executes the Phase 2 analytics engine for a designated portfolio over a given timeframe."""
    portfolio_res = get_portfolio_snapshot(portfolio_id)
    if "error" in portfolio_res and not portfolio_res["holdings"]:
        return {"error": portfolio_res["error"], "analytics": None}

    # Extract symbols to load current 30D volatility from market data
    symbols = [h["symbol"] for h in portfolio_res["holdings"]]
    mkt = fetch_market_data(symbols).get("market_data", {})
    market_vols = {sym: data.get("volatility_30d", 16.5) for sym, data in mkt.items()}

    payload = {
        "portfolio_id": portfolio_id,
        "timeframe": timeframe,
        "holdings": portfolio_res["holdings"],
        "historical_returns": {
            "timeframe": timeframe,
            "market_volatilities": market_vols
        }
    }

    analytics_output = run_analytics_engine(payload)
    return {"analytics": analytics_output}
