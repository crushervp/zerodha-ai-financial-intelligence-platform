import csv
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_news_signals.csv"

def fetch_news_signals(symbols: Optional[List[str]] = None, sector: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves relevant corporate updates and sector news."""
    signals: List[Dict[str, Any]] = []
    
    if not DATA_PATH.exists():
        return {"news_signals": []}

    target_symbols = set(symbols or [])

    with open(DATA_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            matched_symbol = row["symbol"] in target_symbols
            matched_sector = bool(sector and row["sector"].lower() == sector.lower())
            
            if matched_symbol or matched_sector or (not symbols and not sector):
                signals.append({
                    "news_id": row["news_id"],
                    "symbol": row["symbol"],
                    "sector": row["sector"],
                    "headline": row["headline"],
                    "summary": row["summary"],
                    "impact_tag": row.get("impact_tag", "NEUTRAL"),
                    "published_at": row["published_at"]
                })

    return {"news_signals": signals}