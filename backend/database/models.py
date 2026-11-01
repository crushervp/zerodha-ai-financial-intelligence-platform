from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DataFreshness(str, Enum):
    REAL_TIME = "REAL_TIME"
    DELAYED = "DELAYED"
    STALE = "STALE"

class CardCategory(str, Enum):
    EDUCATIONAL_INSIGHT = "EDUCATIONAL_INSIGHT"
    RISK_ALERT = "RISK_ALERT"
    RECOMMENDATION_PROMPT = "RECOMMENDATION_PROMPT"

class HoldingItem(BaseModel):
    instrument_id: str
    symbol: str
    sector: str
    quantity: int = Field(gt=0)
    average_price: float = Field(ge=0.0)
    current_price: float = Field(ge=0.0)

class PortfolioSnapshot(BaseModel):
    portfolio_id: str
    as_of_timestamp: datetime
    benchmark_symbol: str = "NIFTY 50"
    holdings: List[HoldingItem]
    timeframe: str = "1M"

class RecommendationCard(BaseModel):
    card_id: str
    category: CardCategory
    title: str
    summary: str
    rationale: str
    supporting_metrics: Dict[str, Any]
    confidence: float = Field(ge=0.0, le=1.0)
    disclaimer: str
    freshness: DataFreshness = DataFreshness.REAL_TIME