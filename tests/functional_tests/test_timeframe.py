import pytest
from fastapi.testclient import TestClient
from backend.main import app, JOBS_STORE, INSIGHTS_STORE

client = TestClient(app)

def test_timeframe_filter_produces_differentiated_metrics():
    """
    Validates that the Timeframe Filter (1W, 1M, 3M, 1Y) computes distinct,
    deterministic metrics across different investment horizons.
    """
    timeframes = ["1W", "1M", "3M", "1Y"]
    results = {}

    for tf in timeframes:
        resp = client.post("/api/portfolio-analysis", json={
            "portfolio_id": "port_diversified_01",
            "timeframe": tf
        })
        assert resp.status_code == 200
        data = resp.json()
        job_id = data["job_id"]
        assert data["timeframe"] == tf

        # Retrieve completed insights
        insights_resp = client.get(f"/api/insights/{job_id}")
        assert insights_resp.status_code == 200
        insight_data = insights_resp.json()
        assert insight_data["status"] == "COMPLETED"

        ins = insight_data["insights"]
        summary = ins.get("summary_metrics", {})
        risk = ins.get("risk_metrics", {})

        results[tf] = {
            "timeframe": ins.get("timeframe"),
            "timeframe_return_pct": summary.get("timeframe_return_pct"),
            "timeframe_pnl": summary.get("timeframe_pnl"),
            "annualized_volatility": risk.get("annualized_volatility"),
            "max_drawdown": risk.get("max_drawdown"),
        }

    # Verify each timeframe is assigned properly
    for tf in timeframes:
        assert results[tf]["timeframe"] == tf
        assert results[tf]["annualized_volatility"] > 0
        assert results[tf]["max_drawdown"] < 0

    # Verify that returns scale with horizon (1W < 1M < 3M < 1Y)
    returns_1w = results["1W"]["timeframe_return_pct"]
    returns_1m = results["1M"]["timeframe_return_pct"]
    returns_3m = results["3M"]["timeframe_return_pct"]
    returns_1y = results["1Y"]["timeframe_return_pct"]

    assert returns_1w < returns_1m < returns_3m < returns_1y, (
        f"Expected 1W ({returns_1w}%) < 1M ({returns_1m}%) < 3M ({returns_3m}%) < 1Y ({returns_1y}%)"
    )

    # Verify that Max Drawdown is deeper for longer horizons
    # e.g. 1W drawdown is less negative than 1Y drawdown
    mdd_1w = results["1W"]["max_drawdown"]
    mdd_1y = results["1Y"]["max_drawdown"]
    assert mdd_1w > mdd_1y, f"1W MDD ({mdd_1w}) should be higher (less negative) than 1Y MDD ({mdd_1y})"
