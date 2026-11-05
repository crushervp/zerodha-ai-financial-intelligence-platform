# Zerodha AI Financial Intelligence Platform

A governed, explainable financial portfolio intelligence and risk analytics platform built with **FastAPI**, **Next.js**, **Model Context Protocol (MCP)**, and **Gemini 2.5 Flash**.

---

## 1. Architectural Highlights
- **Zero Hallucination Arithmetic:** Quantitative analytics (HHI concentration index, portfolio beta, annualized volatility, maximum drawdown, sector weights) are deterministically computed using Python (`pandas`, `NumPy`). The LLM does not perform calculations.
- **Model Context Protocol (MCP):** Strict functional wrappers decouple models from raw data stores, providing complete latency and execution auditing.
- **SEBI-Compliant Pre-Delivery Gate:** Automated regex and categorical validation blocks direct buy/sell trade instructions and guaranteed return statements prior to persisting insights.
- **Live Zerodha Kite Integration:** Direct Kite Web authentication supporting 2FA (mobile App Code & TOTP), session enctoken authentication, and Zerodha Console CSV statement parsing.
- **Asynchronous Execution Stepper:** Real-time visibility into the complete 6-stage lifecycle (`PENDING` → `FETCHING_DATA` → `RUNNING_ANALYTICS` → `GENERATING_EXPLANATION` → `VALIDATING_OUTPUT` → `COMPLETED`).

---

## 2. Directory Scaffold

```text
.
├── backend/
│   ├── analytics/           # Deterministic math engine (HHI, Beta, Drawdown, Exposure)
│   ├── database/            # Pydantic schemas, data models, and migration specs
│   ├── services/            # Storage, job tracker, Zerodha Kite auth & session service
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
│   ├── insight_schema.json  # Schema contract for AI insights
│   ├── sample_portfolios.csv
│   ├── sample_market_data.csv
│   └── sample_news_signals.csv
├── frontend/                # Next.js 14/15 + Tailwind CSS user interface
│   ├── app/                 # App router pages (dashboard & telemetry)
│   └── components/          # Charts, risk panels, insight cards & Zerodha modal
└── tests/                   # Pytest automated test suites
    ├── ai_output_tests/     # Verification of SEBI compliance & schema contracts
    ├── analytics_tests/     # Quantitative math tests (zero-hallucination verification)
    └── functional_tests/    # API, MCP server, timeframe & Kite auth tests
```

---

## 3. Local Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ (tested with v22 LTS)

### Backend Setup

```bash
# 1. Create and activate virtual environment
python3 -m venv env
source env/bin/activate  # On Linux/macOS
# or: source env/Scripts/activate  # On Windows

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Run all automated test suites
PYTHONPATH=. pytest tests/ -v

# 4. Start FastAPI server
PYTHONPATH=. python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/portfolio-analysis` | Initiates an asynchronous portfolio intelligence job |
| `GET` | `/api/insights/{job_id}` | Polls analysis status and retrieves completed recommendation cards |
| `POST` | `/api/zerodha/login` | Authenticates with Zerodha Kite (User ID + Password + 2FA or Enctoken) |
| `POST` | `/api/zerodha/upload-csv` | Parses and loads real Zerodha Console/Kite CSV holdings |
| `GET` | `/api/zerodha/status` | Retrieves active Zerodha connection details and holdings count |
| `POST` | `/api/zerodha/sync-market` | Fetches live market quotes for loaded holdings from Yahoo Finance |
| `POST` | `/api/mcp/tools/execute` | Executes registered MCP tools with logged latency |
| `POST` | `/api/feedback` | Submits user helpfulness feedback |
| `GET` | `/api/compliance/audit/{job_id}` | Returns complete compliance snapshots and tool logs |
| `GET` | `/api/operations/metrics` | Telemetry endpoint for operational monitoring |
