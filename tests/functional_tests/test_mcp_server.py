import pytest
from mcp_server.server import execute_tool, get_tool_audit_logs

def test_mcp_portfolio_lookup():
    response = execute_tool("get_portfolio_snapshot", {"portfolio_id": "port_diversified_01"})
    assert response["status"] == "SUCCESS"
    assert "result" in response
    assert response["result"]["holdings_count"] == 5

def test_mcp_analytics_tool():
    response = execute_tool("execute_risk_analytics", {"portfolio_id": "port_concentrated_02"})
    assert response["status"] == "SUCCESS"
    analytics = response["result"]["analytics"]
    assert analytics["summary"]["concentration_status"] == "HIGH"

def test_mcp_missing_tool_audit():
    response = execute_tool("non_existent_tool", {})
    assert response["status"] == "FAILED"
    logs = get_tool_audit_logs()
    assert any(log["tool_name"] == "non_existent_tool" for log in logs)