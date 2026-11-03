import time
from datetime import datetime, timezone
from typing import Dict, Any

from mcp_server.tools.portfolio_tools import get_portfolio_snapshot
from mcp_server.tools.market_tools import fetch_market_data
from mcp_server.tools.news_tools import fetch_news_signals
from mcp_server.tools.analytics_tools import execute_risk_analytics

# In-memory execution log for compliance & observability
TOOL_CALL_LOGS = []

def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a registered MCP tool, tracks execution metrics,
    and returns an auditable response payload.
    """
    start_time = time.perf_counter()
    status = "SUCCESS"
    result = None
    error_msg = None

    try:
        if tool_name == "get_portfolio_snapshot":
            result = get_portfolio_snapshot(arguments.get("portfolio_id", ""))
        elif tool_name == "fetch_market_data":
            result = fetch_market_data(arguments.get("symbols", []))
        elif tool_name == "fetch_news_signals":
            result = fetch_news_signals(
                symbols=arguments.get("symbols"), 
                sector=arguments.get("sector")
            )
        elif tool_name == "execute_risk_analytics":
            result = execute_risk_analytics(
                arguments.get("portfolio_id", ""),
                arguments.get("timeframe", "1M")
            )
        else:
            status = "FAILED"
            error_msg = f"Tool '{tool_name}' not recognized in MCP registry"
            result = {"error": error_msg}
    except Exception as e:
        status = "FAILED"
        error_msg = str(e)
        result = {"error": error_msg}
    finally:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        log_entry = {
            "tool_name": tool_name,
            "arguments": arguments,
            "status": status,
            "latency_ms": latency_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": error_msg
        }
        TOOL_CALL_LOGS.append(log_entry)

    return {
        "tool": tool_name,
        "status": status,
        "latency_ms": latency_ms,
        "result": result
    }

def get_tool_audit_logs():
    """Returns all recorded MCP tool calls."""
    return TOOL_CALL_LOGS