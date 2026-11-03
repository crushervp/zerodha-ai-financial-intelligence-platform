import pytest
from backend.analytics.engine import run_analytics_engine
from backend.analytics.exposure_metrics import compute_holdings_exposure

def test_weights_sum_to_100():
    sample_holdings = [
        {"symbol": "HDFCBANK", "sector": "Financial Services", "quantity": 100, "average_price": 1450.0, "current_price": 1500.0},
        {"symbol": "INFY", "sector": "Information Technology", "quantity": 50, "average_price": 1300.0, "current_price": 1400.0},
        {"symbol": "RELIANCE", "sector": "Energy", "quantity": 20, "average_price": 2400.0, "current_price": 2500.0}
    ]
    res = compute_holdings_exposure(sample_holdings)
    total_weight = sum(h["weight_pct"] for h in res["holdings"])
    assert total_weight == pytest.approx(100.0, abs=.05)

def test_high_concentration_alert():
    # 90% allocation in one stock
    concentrated_holdings = [
        {"symbol": "HDFCBANK", "sector": "Financial Services", "quantity": 900, "average_price": 1500.0, "current_price": 1500.0},
        {"symbol": "INFY", "sector": "Information Technology", "quantity": 10, "average_price": 1400.0, "current_price": 1400.0}
    ]
    payload = {"portfolio_id": "test_concentrated", "holdings": concentrated_holdings}
    result = run_analytics_engine(payload)
    
    assert result["summary"]["concentration_status"] == "HIGH"
    assert result["alert_flags"]["single_stock_concentration"] is True
    assert result["alert_flags"]["sector_concentration"] is True

def test_empty_portfolio_graceful_handling():
    payload = {"portfolio_id": "test_empty", "holdings": []}
    result = run_analytics_engine(payload)
    assert result["summary"]["total_current_value"] == 0.0
    assert result["summary"]["concentration_status"] == "DIVERSIFIED"