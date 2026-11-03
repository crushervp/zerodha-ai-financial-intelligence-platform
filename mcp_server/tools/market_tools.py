import csv
from pathlib import Path
from typing import Dict, Any, List

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_market_data.csv"
# CURRENT_DIR = Path(__file__).resolve().parent
# PROJECT_ROOT = CURRENT_DIR.parent.parent
# DATA_PATH = PROJECT_ROOT / "data" / "sample_market_data.csv"

def fetch_market_data(symbols: List[str]) -> Dict[str, Any]:
    """Retrieves current market data and freshness indicators for requested symbols."""
    results: Dict[str, Any] = {}
    
    if not DATA_PATH.exists():
        return {"error": "Market data source unavailable", "data": {}}

    with open(DATA_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sym = row["symbol"]
            if sym in symbols or sym == "NIFTY 50":
                results[sym] = {
                    "last_price": float(row["last_price"]),
                    "day_change_pct": float(row["day_change_pct"]),
                    "week_change_pct": float(row["week_change_pct"]) if row.get("week_change_pct") else 0.0,
                    "volatility_30d": float(row["volatility_30d"]) if row.get("volatility_30d") else 0.0,
                    "freshness": row.get("freshness", "REAL_TIME"),
                    "updated_at": row.get("updated_at")
                }

    # Handle missing symbols gracefully
    for sym in symbols:
        if sym not in results:
            results[sym] = {
                "last_price": 0.0,
                "day_change_pct": 0.0,
                "freshness": "STALE",
                "note": "Quote unavailable; fallback state applied"
            }

    return {"market_data": results}