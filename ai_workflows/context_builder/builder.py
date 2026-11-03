from typing import Dict, Any, List
from mcp_server.server import execute_tool

def build_analysis_context(portfolio_id: str, timeframe: str = "1M") -> Dict[str, Any]:
    """
    Orchestrates MCP tools to gather analytics, market data, and news
    into a unified context dictionary for the LLM.
    """
    timeframe = (timeframe or "1M").upper()

    # 1. Fetch Analytics with timeframe
    analytics_resp = execute_tool("execute_risk_analytics", {
        "portfolio_id": portfolio_id,
        "timeframe": timeframe
    })
    if analytics_resp.get("status") != "SUCCESS" or not analytics_resp.get("result", {}).get("analytics"):
        raise ValueError(f"Failed to compute analytics for portfolio '{portfolio_id}'")
    
    analytics = analytics_resp["result"]["analytics"]
    holdings = analytics.get("holdings_breakdown", [])
    symbols = [h["symbol"] for h in holdings]
    
    # 2. Fetch Market Data & Freshness
    market_resp = execute_tool("fetch_market_data", {"symbols": symbols})
    market_data = market_resp.get("result", {}).get("market_data", {})
    
    # Determine overall data freshness
    freshness_values = [v.get("freshness", "REAL_TIME") for v in market_data.values()]
    overall_freshness = "STALE" if "STALE" in freshness_values else "REAL_TIME"

    # 3. Fetch News Signals
    sectors = list({h["sector"] for h in holdings})
    news_resp = execute_tool("fetch_news_signals", {"symbols": symbols, "sector": sectors[0] if sectors else None})
    news_signals = news_resp.get("result", {}).get("news_signals", [])

    return {
        "portfolio_id": portfolio_id,
        "timeframe": timeframe,
        "summary": analytics.get("summary", {}),
        "holdings": holdings,
        "top_holdings": analytics.get("top_holdings", []),
        "top_movers": analytics.get("top_movers", {}),
        "sector_analysis": analytics.get("sector_analysis", {}),
        "risk_metrics": analytics.get("risk_metrics", {}),
        "benchmark_comparison": analytics.get("benchmark_comparison", {}),
        "alert_flags": analytics.get("alert_flags", {}),
        "market_context": market_data,
        "news_signals": news_signals,
        "data_freshness": overall_freshness
    }
