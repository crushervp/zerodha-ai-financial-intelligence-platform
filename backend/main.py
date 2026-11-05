import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.services.storage_service import (
    JOBS_STORE, INSIGHTS_STORE, AUDIT_STORE, FEEDBACK_STORE,
    create_job, update_job_status, save_insights, get_insights,
    record_audit, get_audit, record_feedback
)
from mcp_server.server import execute_tool, get_tool_audit_logs
from ai_workflows.context_builder.builder import build_analysis_context
from ai_workflows.llm_analysis.analyzer import generate_portfolio_analysis
from ai_workflows.validation.validator import validate_analysis_output
from backend.services.zerodha_service import (
    ZERODHA_SESSION,
    authenticate_zerodha_user,
    sync_holdings_with_live_market,
    parse_kite_holdings_csv,
    disconnect_zerodha_session
)

app = FastAPI(
    title="Zerodha AI Financial Intelligence Platform API",
    version="1.0.0",
    description="Governed portfolio intelligence, risk analytics, and explainable recommendations API."
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request Models -----------------
class PortfolioAnalysisRequest(BaseModel):
    portfolio_id: str
    timeframe: Optional[str] = "1M"

class ToolExecutionRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class FeedbackRequest(BaseModel):
    card_id: str
    user_action: str
    comments: Optional[str] = None

class ZerodhaLoginRequest(BaseModel):
    auth_type: str = "DEMO"
    client_id: Optional[str] = "ZR1001"
    password: Optional[str] = None
    totp: Optional[str] = None
    enctoken: Optional[str] = None
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    request_token: Optional[str] = None
    api_secret: Optional[str] = None

class ZerodhaCsvUploadRequest(BaseModel):
    csv_content: str
    client_id: Optional[str] = "KITE_CSV_USER"

# ----------------- Async Worker -----------------
def run_analysis_pipeline(job_id: str, portfolio_id: str, timeframe: str = "1M"):
    """
    Executes the lifecycle stages:
    PENDING -> FETCHING_DATA -> RUNNING_ANALYTICS -> GENERATING_EXPLANATION -> VALIDATING_OUTPUT -> COMPLETED
    """
    try:
        update_job_status(job_id, "FETCHING_DATA")
        context = build_analysis_context(portfolio_id, timeframe)

        update_job_status(job_id, "RUNNING_ANALYTICS")
        # Analytics computed inside build_analysis_context via MCP

        update_job_status(job_id, "GENERATING_EXPLANATION")
        analysis_output = generate_portfolio_analysis(context)

        update_job_status(job_id, "VALIDATING_OUTPUT")
        is_valid, validation_msg = validate_analysis_output(analysis_output, context)
        
        if not is_valid:
            raise ValueError(f"Compliance validation failed: {validation_msg}")

        # Attach deterministic quantitative metrics and holdings for rich UI views
        analysis_output["summary_metrics"] = context.get("summary", {})
        analysis_output["risk_metrics"] = context.get("risk_metrics", {})
        analysis_output["holdings"] = context.get("holdings", [])
        analysis_output["sector_analysis"] = context.get("sector_analysis", {})
        analysis_output["benchmark_comparison"] = context.get("benchmark_comparison", {})
        analysis_output["alert_flags"] = context.get("alert_flags", {})
        analysis_output["timeframe"] = timeframe

        # Persist insights and audit snapshot
        save_insights(job_id, analysis_output)
        record_audit(job_id, {
            "job_id": job_id,
            "portfolio_id": portfolio_id,
            "timeframe": timeframe,
            "model_version": "gemini-2.5-flash",
            "prompt_version": "v1.0-explainable-regulated",
            "validation_status": "PASSED",
            "validation_message": validation_msg,
            "context_snapshot": context,
            "output_snapshot": analysis_output,
            "tool_calls": get_tool_audit_logs(),
            "completed_at": datetime.now(timezone.utc).isoformat()
        })

        update_job_status(job_id, "COMPLETED")
    except Exception as e:
        update_job_status(job_id, "FAILED", error=str(e))

# ----------------- Endpoints -----------------
@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/portfolio-analysis")
def initiate_analysis(request: PortfolioAnalysisRequest, background_tasks: BackgroundTasks):
    """Initiates an asynchronous portfolio analysis job."""
    timeframe = request.timeframe or "1M"
    job_id = create_job(request.portfolio_id, timeframe)
    background_tasks.add_task(run_analysis_pipeline, job_id, request.portfolio_id, timeframe)
    return {"job_id": job_id, "status": "PENDING", "portfolio_id": request.portfolio_id, "timeframe": timeframe}

@app.get("/api/insights/{job_id}")
def retrieve_insights(job_id: str):
    """Retrieves the analysis status and completed insight report."""
    job = JOBS_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    
    insights = get_insights(job_id)
    return {
        "job_id": job_id,
        "status": job["status"],
        "error_message": job.get("error_message"),
        "insights": insights
    }

@app.post("/api/mcp/tools/execute")
def execute_mcp_tool(request: ToolExecutionRequest):
    """Routes governed tool execution through the MCP server."""
    res = execute_tool(request.tool_name, request.arguments)
    return res

@app.post("/api/feedback")
def submit_feedback(request: FeedbackRequest):
    """Captures user feedback or compliance review actions."""
    record_feedback(request.card_id, request.user_action, request.comments)
    return {"status": "SUCCESS", "message": "Feedback recorded"}

@app.get("/api/compliance/audit/{job_id}")
def retrieve_audit(job_id: str):
    """Retrieves compliance traceability data for a specific analysis job."""
    audit = get_audit(job_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit record not found for this job")
    return audit

@app.get("/api/operations/metrics")
def retrieve_ops_metrics():
    """Aggregates operational health metrics for monitoring dashboards."""
    total_jobs = len(JOBS_STORE)
    completed_jobs = sum(1 for j in JOBS_STORE.values() if j["status"] == "COMPLETED")
    failed_jobs = sum(1 for j in JOBS_STORE.values() if j["status"] == "FAILED")
    
    return {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "success_rate_pct": round((completed_jobs / total_jobs * 100), 2) if total_jobs > 0 else 100.0,
        "total_feedback_entries": len(FEEDBACK_STORE),
        "recent_tool_calls": len(get_tool_audit_logs())
    }

# ----------------- Zerodha Kite Connect & Account Endpoints -----------------
@app.post("/api/zerodha/login")
def zerodha_login(req: ZerodhaLoginRequest):
    """Authenticates a user with Zerodha Kite (via Kite Connect API or interactive demo)."""
    try:
        session = authenticate_zerodha_user(
            auth_type=req.auth_type,
            client_id=req.client_id,
            password=req.password,
            totp=req.totp,
            enctoken=req.enctoken,
            api_key=req.api_key,
            access_token=req.access_token,
            request_token=req.request_token,
            api_secret=req.api_secret
        )
        return {"status": "SUCCESS", "session": session}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/zerodha/session")
def get_zerodha_session():
    """Retrieves the active Zerodha session status and holdings."""
    from backend.services.zerodha_service import get_active_session
    return get_active_session()

@app.post("/api/zerodha/sync-live-market")
def sync_zerodha_live_market():
    """Re-syncs active Zerodha holdings with live NSE real-time quotes."""
    global ZERODHA_SESSION
    if not ZERODHA_SESSION.get("is_connected"):
        raise HTTPException(status_code=400, detail="No active Zerodha portfolio connected")
    
    if ZERODHA_SESSION.get("holdings"):
        updated = sync_holdings_with_live_market(ZERODHA_SESSION["holdings"])
        ZERODHA_SESSION["holdings"] = updated
    ZERODHA_SESSION["live_market_synced"] = True
    from backend.services.zerodha_service import _save_session_cache
    _save_session_cache()
    return {"status": "SUCCESS", "session": ZERODHA_SESSION}

@app.post("/api/zerodha/upload-csv")
def upload_kite_csv(req: ZerodhaCsvUploadRequest):
    """Parses exported Kite holdings CSV statement and sets it as active portfolio."""
    global ZERODHA_SESSION
    try:
        holdings = parse_kite_holdings_csv(req.csv_content)
        ZERODHA_SESSION.clear()
        ZERODHA_SESSION.update({
            "is_connected": True,
            "user_id": req.client_id or "KITE_CSV_USER",
            "user_name": f"Kite Investor ({req.client_id or 'Statement'})",
            "email": "investor@kite.statement",
            "broker": "ZERODHA",
            "access_token": "csv_session",
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "holdings": holdings,
            "live_market_synced": True
        })
        from backend.services.zerodha_service import _save_session_cache
        _save_session_cache()
        return {"status": "SUCCESS", "session": ZERODHA_SESSION}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/zerodha/logout")
def zerodha_logout():
    """Disconnects the active Zerodha session."""
    return disconnect_zerodha_session()