import pandas as pd
from typing import List, Dict, Any

def compute_sector_distribution(holdings_with_weights: List[Dict[str, Any]], sector_alert_threshold: float = 35.0) -> Dict[str, Any]:
    """
    Aggregates holdings into sectors, computes total sector weights,
    and flags sectors exceeding the risk threshold.
    """
    if not holdings_with_weights:
        return {"sectors": [], "overweighted_sectors": []}

    df = pd.DataFrame(holdings_with_weights)
    
    # Group by sector
    sector_summary = df.groupby("sector").agg(
        total_value=("current_value", "sum"),
        weight_pct=("weight_pct", "sum"),
        stock_count=("symbol", "count"),
        total_pnl=("unrealized_pnl", "sum")
    ).reset_index()

    # Sort descending by weight
    sector_summary = sector_summary.sort_values(by="weight_pct", ascending=False)
    
    overweighted = sector_summary[sector_summary["weight_pct"] > sector_alert_threshold]
    overweighted_list = overweighted["sector"].tolist()

    sectors_list = sector_summary.round(2).to_dict(orient="records")

    return {
        "sectors": sectors_list,
        "overweighted_sectors": overweighted_list,
        "dominant_sector": sectors_list[0]["sector"] if sectors_list else None
    }