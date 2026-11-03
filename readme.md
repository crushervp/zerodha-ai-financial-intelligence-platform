# Zerodha AI Financial Intelligence Platform

A governed, explainable financial portfolio intelligence and risk analytics platform built with **FastAPI**, **Next.js**, **Model Context Protocol (MCP)**, and **Gemini 2.5 Flash**.

---

## 1. Architectural Highlights
- **Zero Hallucination Arithmetic:** Quantitative analytics (HHI index, portfolio beta, annualized volatility, maximum drawdown, sector weights) are deterministically computed using Python (`pandas`, `NumPy`). The LLM does not perform calculations.
- **Model Context Protocol (MCP):** Strict functional wrappers decouple models from raw data stores, providing complete latency and execution auditing.
- **SEBI-Compliant Pre-Delivery Gate:** Automated regex and categorical validation blocks direct buy/sell trade instructions and guaranteed return statements prior to persisting insights.
- **Asynchronous Execution Stepper:** Real-time visibility into the complete 6-stage lifecycle (`PENDING` → `FETCHING_DATA` → `RUNNING_ANALYTICS` → `GENERATING_EXPLANATION` → `VALIDATING_OUTPUT` → `COMPLETED`).

---

## 2. Directory Scaffold
├── backend/
│   ├── analytics/           # Deterministic math engine (HHI, Beta, Drawdown, Exposure)
│   ├── database/            # Pydantic schemas and SQL migrations
│   ├── services/            # In-memory storage, job tracker, and compliance audit store
│   └── main.py              # FastAPI endpoints and async background worker
├── mcp_server/
│   ├── tools/               # Portfolio, market, news, and analytics tool wrappers
│   ├── server.py            # Governed execution dispatcher with latency tracking
│   └── tool_registry.json   # Machine-readable MCP registry schema
├── ai_workflows/
│   ├── context_builder/     # Privacy-sanitized context aggregator
│   ├── prompt_templates/    # System prompts and schema contracts
│   ├── llm_analysis/        # Gemini API integration with offline mock fallback
│   └── validation/          # Pre-delivery compliance gate and prohibited phrase checker
├── data/
│   ├── sample_portfolios.csv
│   ├── sample_market_data.csv
│   └── sample_news_signals.csv
├── frontend/                # Next.js 16 + Tailwind CSS user interface
└── tests/                   # Pytest automated test suites
---

## 3. Local Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
# Activate virtual environment
source env/Scripts/activate

# Install dependencies
pip install pandas numpy pydantic pytest fastapi uvicorn mcp httpx google-genai

# Run all automated test suites
python -m pytest tests/analytics_tests/test_analytics.py -v
python -m pytest tests/functional_tests/test_mcp_server.py -v
python -m pytest tests/ai_output_tests/test_ai_workflow.py -v
python -m pytest tests/functional_tests/test_api.py -v

# Start FastAPI server
python -m uvicorn backend.main:app --reload --port 8000

Frontend Setup

cd frontend
npm install
npm run dev

Open http://localhost:3000 in your browser.

4. API Endpoints
POST /api/portfolio-analysis: Initiates an asynchronous portfolio intelligence job.

GET /api/insights/{job_id}: Polls analysis status and retrieves completed recommendation cards.

POST /api/mcp/tools/execute: Executes registered MCP tools with logged latency.

POST /api/feedback: Submits user helpfulness feedback.

GET /api/compliance/audit/{job_id}: Returns complete compliance snapshots and tool logs.

GET /api/operations/metrics: Telemetry endpoint for ops monitoring.