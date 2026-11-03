SYSTEM_EXPLAINER_PROMPT = """
You are the AI Financial Intelligence Engine for Zerodha.
Your purpose is to provide plain-language, explainable portfolio context to investors based STRICTLY on the deterministic metrics and news provided.

NON-NEGOTIABLE COMPLIANCE RULES:
1. Grounding: You must NEVER invent, extrapolate, or hallucinate metrics. Cite only numbers present in the provided context.
2. No Financial Advice: Never issue direct buy/sell trade instructions (e.g., do not say "Sell INFY" or "Buy HDFC"). Instead, frame insights as reviewable observations (e.g., "Review concentration in Banking sector", "Monitor volatility in Energy holdings").
3. No Guarantees: Never promise, project, or imply guaranteed returns or price targets.
4. Categorization: You must classify every output card strictly as one of:
   - "EDUCATIONAL_INSIGHT": General market context, sector dynamics, or portfolio behavior explanations.
   - "RISK_ALERT": Threshold breaches like single-stock concentration, sector drift, or high drawdown.
   - "RECOMMENDATION_PROMPT": Suggested review areas (e.g., rebalancing review, diversification check, watchlist monitoring).
5. Output format: You must respond ONLY with a valid JSON object matching the requested schema. No markdown formatting outside the JSON, no commentary.
"""

def build_user_prompt(context: dict) -> str:
    import json
    return f"""
Analyze the following portfolio context and generate an explainable portfolio intelligence report:

PORTFOLIO CONTEXT:
{json.dumps(context, indent=2)}

OUTPUT SCHEMA:
Generate a valid JSON object with the following structure:
{{
  "portfolio_id": "{context.get('portfolio_id')}",
  "summary": "Concise 2-3 sentence overview of portfolio performance, exposure, and key driver.",
  "portfolio_health_score": <number between 0 and 100 based on diversification, beta, and drawdown>,
  "key_drivers": [
    {{
      "symbol": "<symbol>",
      "impact_pct": <float>,
      "direction": "POSITIVE" | "NEGATIVE",
      "rationale": "<plain language explanation connecting movement to news or market signals>"
    }}
  ],
  "recommendation_cards": [
    {{
      "card_id": "card_01",
      "category": "EDUCATIONAL_INSIGHT" | "RISK_ALERT" | "RECOMMENDATION_PROMPT",
      "title": "<Concise descriptive title>",
      "summary": "<Short explanation>",
      "rationale": "<Step-by-step reasoning referencing specific numbers from analytics>",
      "supporting_metrics": {{
        "metric_name": "<value>"
      }},
      "confidence": <float between 0.0 and 1.0>,
      "disclaimer": "Generated for educational and risk awareness purposes. Not investment advice."
    }}
  ],
  "data_freshness": "{context.get('data_freshness', 'REAL_TIME')}",
  "regulatory_disclaimer": "This intelligence summary is generated for educational and risk monitoring purposes only. It does not constitute SEBI-registered investment advice or trade recommendations."
}}
"""