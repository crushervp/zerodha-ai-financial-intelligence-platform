import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.zerodha_service import disconnect_zerodha_session

client = TestClient(app)

def setup_function():
    disconnect_zerodha_session()

def teardown_function():
    disconnect_zerodha_session()

def test_zerodha_demo_login():
    res = client.post("/api/zerodha/login", json={
        "auth_type": "DEMO",
        "client_id": "ZR1001",
        "password": "demopassword",
        "totp": "123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["session"]["is_connected"] is True
    assert data["session"]["user_id"] == "ZR1001"
    assert len(data["session"]["holdings"]) >= 4

def test_zerodha_session_retrieval():
    # Login first
    client.post("/api/zerodha/login", json={"auth_type": "DEMO", "client_id": "ZR2002"})
    
    # Retrieve session
    res = client.get("/api/zerodha/session")
    assert res.status_code == 200
    session = res.json()
    assert session["is_connected"] is True
    assert session["user_id"] == "ZR2002"

def test_zerodha_portfolio_analysis_lifecycle():
    # 1. Login
    client.post("/api/zerodha/login", json={"auth_type": "DEMO", "client_id": "ZR1001"})
    
    # 2. Trigger analysis with port_user_zerodha
    res = client.post("/api/portfolio-analysis", json={"portfolio_id": "port_user_zerodha", "timeframe": "1M"})
    assert res.status_code == 200
    job_id = res.json()["job_id"]
    
    # 3. Retrieve completed insights
    import time
    for _ in range(10):
        poll = client.get(f"/api/insights/{job_id}")
        assert poll.status_code == 200
        data = poll.json()
        if data["status"] == "COMPLETED":
            assert len(data["insights"]["holdings"]) >= 4
            assert "risk_metrics" in data["insights"]
            assert data["insights"]["risk_metrics"]["portfolio_beta"] > 0
            break
        time.sleep(0.3)

def test_zerodha_csv_statement_upload():
    sample_kite_csv = """Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg. %,Day chg. %
INFY,50,1400.00,1380.00,69000.00,-1000.00,-1.43,-0.85
RELIANCE,30,2400.00,2550.00,76500.00,4500.00,6.25,1.20
TCS,20,3500.00,3600.00,72000.00,2000.00,2.86,0.40"""

    res = client.post("/api/zerodha/upload-csv", json={
        "csv_content": sample_kite_csv,
        "client_id": "MY_CUSTOM_STATEMENT"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["session"]["is_connected"] is True
    assert len(data["session"]["holdings"]) == 3

def test_zerodha_logout():
    client.post("/api/zerodha/login", json={"auth_type": "DEMO", "client_id": "ZR1001"})
    logout_res = client.post("/api/zerodha/logout")
    assert logout_res.status_code == 200
    
    session_res = client.get("/api/zerodha/session")
    assert session_res.json()["is_connected"] is False

def test_unrecognized_demo_id_raises_clear_error():
    res = client.post("/api/zerodha/login", json={
        "auth_type": "DEMO",
        "client_id": "UNKNOWN_USER_123"
    })
    assert res.status_code == 400
    assert "not a recognized demo account" in res.json()["detail"]

def test_zerodha_console_csv_statement_upload():
    console_csv = """Symbol,ISIN,Quantity Available,Quantity Discrepant,Average Price,Previous Closing Price
HDFCBANK,INE040A01034,100,0,1450.00,1520.00
ICICIBANK,INE090A01021,200,0,980.00,1050.00"""
    res = client.post("/api/zerodha/upload-csv", json={
        "csv_content": console_csv,
        "client_id": "MY_CONSOLE_PORTFOLIO"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert len(data["session"]["holdings"]) == 2
    assert data["session"]["holdings"][0]["symbol"] == "HDFCBANK"

def test_real_kite_web_login_validation():
    # Attempt real login with dummy credentials without TOTP
    res = client.post("/api/zerodha/login", json={
        "auth_type": "KITE_WEB",
        "client_id": "AB1234",
        "password": "mysecretpassword"
    })
    # Should reject or fail with specific Zerodha error, not return mock portfolio
    assert res.status_code == 400
    assert ("TOTP" in res.json()["detail"] or "Zerodha" in res.json()["detail"] or "Invalid" in res.json()["detail"])
