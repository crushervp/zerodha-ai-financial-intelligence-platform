import pytest
import time
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_full_analysis_api_lifecycle():
    # 1. Trigger analysis job
    res = client.post("/api/portfolio-analysis", json={"portfolio_id": "port_diversified_01", "timeframe": "1M"})
    assert res.status_code == 200
    job_id = res.json()["job_id"]
    assert job_id.startswith("job_")

    # 2. Poll until background job completes
    completed = False
    for _ in range(10):
        poll = client.get(f"/api/insights/{job_id}")
        assert poll.status_code == 200
        data = poll.json()
        if data["status"] == "COMPLETED":
            completed = True
            assert data["insights"] is not None
            assert len(data["insights"]["recommendation_cards"]) >= 1
            break
        elif data["status"] == "FAILED":
            pytest.fail(f"Job failed with error: {data.get('error_message')}")
        time.sleep(0.5)

    assert completed is True

    # 3. Verify compliance audit trail endpoint
    audit_res = client.get(f"/api/compliance/audit/{job_id}")
    assert audit_res.status_code == 200
    audit_json = audit_res.json()
    assert audit_json["validation_status"] == "PASSED"
    assert "context_snapshot" in audit_json

    # 4. Verify feedback capture
    fb_res = client.post("/api/feedback", json={
        "card_id": data["insights"]["recommendation_cards"][0]["card_id"],
        "user_action": "HELPFUL",
        "comments": "Accurate concentration breakdown"
    })
    assert fb_res.status_code == 200

    # 5. Verify operations metrics endpoint
    ops_res = client.get("/api/operations/metrics")
    assert ops_res.status_code == 200
    assert ops_res.json()["completed_jobs"] >= 1