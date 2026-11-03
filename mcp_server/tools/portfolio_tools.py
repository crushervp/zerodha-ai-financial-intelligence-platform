import csv
from pathlib import Path
from typing import Dict, Any, List

# Locate root directory robustly
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parent.parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "sample_portfolios.csv"

def get_portfolio_snapshot(portfolio_id: str) -> Dict[str, Any]:
    """Retrieves normalized holdings for a given portfolio without PII."""
    # Check for live connected Zerodha session
    if portfolio_id == "port_user_zerodha":
        try:
            from backend.services.zerodha_service import ZERODHA_SESSION
            if ZERODHA_SESSION.get("is_connected") and ZERODHA_SESSION.get("holdings"):
                return {
                    "portfolio_id": "port_user_zerodha",
                    "holdings_count": len(ZERODHA_SESSION["holdings"]),
                    "holdings": ZERODHA_SESSION["holdings"]
                }
        except ImportError:
            pass

    holdings: List[Dict[str, Any]] = []
    
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Portfolio file not found at: {DATA_PATH.resolve()}")

    with open(DATA_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=1):
            if not row or not any(row.values()):
                continue  # skip blank lines
            
            if row.get("portfolio_id") == portfolio_id:
                try:
                    holdings.append({
                        "instrument_id": row.get("instrument_id", ""),
                        "symbol": row.get("symbol", ""),
                        "sector": row.get("sector", ""),
                        "quantity": int(float(row.get("quantity", 0))),
                        "average_price": float(row.get("average_price", 0.0)),
                        "current_price": float(row.get("current_price", 0.0)),
                        "timestamp": row.get("timestamp", "")
                    })
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Invalid numeric data at row {row_idx} in {DATA_PATH}: {e}")

    if not holdings:
        raise ValueError(f"Portfolio ID '{portfolio_id}' not found in {DATA_PATH}")

    return {
        "portfolio_id": portfolio_id,
        "holdings_count": len(holdings),
        "holdings": holdings
    }
