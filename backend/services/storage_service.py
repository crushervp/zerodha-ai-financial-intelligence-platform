from typing import Dict, Any, Optional
from datetime import datetime, timezone

# Central in-memory storage for jobs, insights, feedback, and audits
JOBS_STORE: Dict[str, Dict[str, Any]] = {}
INSIGHTS_STORE: Dict[str, Dict[str, Any]] = {}
AUDIT_STORE: Dict[str, Dict[str, Any]] = {}
FEEDBACK_STORE: list = []

def create_job(portfolio_id: str, timeframe: str = "1M") -> str:
    import uuid
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    JOBS_STORE[job_id] = {
        "job_id": job_id,
        "portfolio_id": portfolio_id,
        "timeframe": timeframe,
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "error_message": None
    }
    return job_id

def update_job_status(job_id: str, status: str, error: Optional[str] = None):
    if job_id in JOBS_STORE:
        JOBS_STORE[job_id]["status"] = status
        if error:
            JOBS_STORE[job_id]["error_message"] = error
        if status in ("COMPLETED", "FAILED"):
            JOBS_STORE[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

def save_insights(job_id: str, insight_payload: Dict[str, Any]):
    INSIGHTS_STORE[job_id] = insight_payload

def get_insights(job_id: str) -> Optional[Dict[str, Any]]:
    return INSIGHTS_STORE.get(job_id)

def record_audit(job_id: str, audit_data: Dict[str, Any]):
    AUDIT_STORE[job_id] = audit_data

def get_audit(job_id: str) -> Optional[Dict[str, Any]]:
    return AUDIT_STORE.get(job_id)

def record_feedback(card_id: str, user_action: str, comments: Optional[str] = None):
    FEEDBACK_STORE.append({
        "card_id": card_id,
        "user_action": user_action,
        "comments": comments,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })