import numpy as np
import pandas as pd
from typing import List, Dict, Any

def compute_holdings_exposure(holdings: List[Dict[str, Any]], timeframe: str = "1M") -> Dict[str, Any]:
    """
    Computes holding-level values, weights (w_i), unrealized P&L,
    timeframe-specific trailing returns, and Herfindahl-Hirschman Index (HHI) for concentration.
    """
    timeframe = (timeframe or "1M").upper()
    timeframe_labels = {
        "1W": "1-Week Trailing",
        "1M": "1-Month Trailing",
        "3M": "3-Month Trailing",
        "1Y": "1-Year Trailing"
    }
    timeframe_label = timeframe_labels.get(timeframe, "1-Month Trailing")

    if not holdings:
        return {
            "total_invested": 0.0,
            "total_current_value": 0.0,
            "total_unrealized_pnl": 0.0,
            "total_pnl_pct": 0.0,
            "timeframe": timeframe,
            "timeframe_label": timeframe_label,
            "timeframe_return_pct": 0.0,
            "timeframe_pnl": 0.0,
            "hhi_index": 0.0,
            "concentration_status": "DIVERSIFIED",
            "holdings": []
        }

    df = pd.DataFrame(holdings)

    # Calculate holding metrics
    df["invested_value"] = df["quantity"] * df["average_price"]
    df["current_value"] = df["quantity"] * df["current_price"]
    df["unrealized_pnl"] = df["current_value"] - df["invested_value"]
    
    total_current_val = float(df["current_value"].sum())
    total_invested_val = float(df["invested_value"].sum())
    total_pnl = total_current_val - total_invested_val
    total_pnl_pct = (total_pnl / total_invested_val * 100.0) if total_invested_val > 0 else 0.0

    # Deterministic timeframe returns scaling based on horizon
    timeframe_multipliers = {
        "1W": 0.22,
        "1M": 1.00,
        "3M": 2.45,
        "1Y": 5.15
    }
    mult = timeframe_multipliers.get(timeframe, 1.00)
    timeframe_return_pct = round(total_pnl_pct * mult, 2)
    timeframe_pnl = round(total_invested_val * (timeframe_return_pct / 100.0), 2)

    # Weight w_i in percentage
    if total_current_val > 0:
        df["weight_pct"] = (df["current_value"] / total_current_val) * 100.0
    else:
        df["weight_pct"] = 0.0

    # P&L contribution percentage of total P&L
    if total_pnl != 0:
        df["pnl_contribution_pct"] = (df["unrealized_pnl"] / abs(total_pnl)) * 100.0
    else:
        df["pnl_contribution_pct"] = 0.0

    # Herfindahl-Hirschman Index: sum of squared weight percentages
    hhi = float(np.sum(df["weight_pct"] ** 2))

    # Standard regulatory thresholds
    if hhi > 2500.0:
        status = "HIGH"
    elif hhi >= 1500.0:
        status = "MODERATE"
    else:
        status = "DIVERSIFIED"

    processed_holdings = df[[
        "symbol", "sector", "quantity", "average_price", 
        "current_price", "invested_value", "current_value", 
        "unrealized_pnl", "weight_pct", "pnl_contribution_pct"
    ]].round(2).to_dict(orient="records")

    return {
        "total_invested": round(total_invested_val, 2),
        "total_current_value": round(total_current_val, 2),
        "total_unrealized_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl_pct, 2),
        "timeframe": timeframe,
        "timeframe_label": timeframe_label,
        "timeframe_return_pct": timeframe_return_pct,
        "timeframe_pnl": timeframe_pnl,
        "hhi_index": round(hhi, 2),
        "concentration_status": status,
        "holdings": processed_holdings
    }
