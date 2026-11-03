import pytest
from ai_workflows.context_builder.builder import build_analysis_context
from ai_workflows.llm_analysis.analyzer import generate_portfolio_analysis
from ai_workflows.validation.validator import validate_analysis_output

def test_full_ai_pipeline_with_mock():
    # 1. Build context using MCP tools
    context = build_analysis_context("port_concentrated_02")
    assert context["portfolio_id"] == "port_concentrated_02"
    assert "summary" in context
    
    # 2. Generate analysis (runs mock fallback when GEMINI_API_KEY is not set)
    analysis = generate_portfolio_analysis(context)
    assert analysis["portfolio_id"] == "port_concentrated_02"
    assert len(analysis["recommendation_cards"]) >= 1

    # 3. Validate output compliance
    is_valid, reason = validate_analysis_output(analysis, context)
    assert is_valid is True, f"Validation failed: {reason}"

def test_validator_catches_unauthorized_claims():
    bad_output = {
        "portfolio_id": "test",
        "summary": "This stock is a guaranteed profit and you must buy it now.",
        "regulatory_disclaimer": "Not investment advice.",
        "recommendation_cards": [
            {
                "card_id": "c1",
                "category": "RISK_ALERT",
                "confidence": 0.9,
                "disclaimer": "Not advice."
            }
        ]
    }
    is_valid, reason = validate_analysis_output(bad_output, {})
    assert is_valid is False
    assert "Compliance violation" in reason