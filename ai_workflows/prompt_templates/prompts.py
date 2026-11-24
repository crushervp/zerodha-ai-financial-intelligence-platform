SYSTEM_EXPLAINER_PROMPT = """
You are the AI Financial Intelligence Engine for Zerodha.
Your purpose is to provide plain-language, explainable portfolio context and highly actionable intelligence to investors based STRICTLY on the deterministic metrics and news provided.

NON-NEGOTIABLE COMPLIANCE RULES:
1. Grounding: You must NEVER invent, extrapolate, or hallucinate metrics. Cite only numbers present in the provided context.
2. Actionable Framing Without Advice: Provide clear, practical action steps using prudential risk management frameworks (e.g., "Consider trimming position from 40% to 25% to align with sector caps", "Evaluate establishing a trailing stop-loss alert around support", "Explore tax-loss harvesting to offset capital gains"). Never issue unconditional buy/sell directives (e.g., do not say "You must sell INFY immediately").
3. No Guarantees: Never promise, project, or imply guaranteed returns or speculative price targets.
4. Categorization & Action Types:
   - Category: "EDUCATIONAL_INSIGHT" | "RISK_ALERT" | "RECOMMENDATION_PROMPT"
   - Action Type: "PORTFOLIO_REBALANCE" | "PROFIT_BOOKING" | "RISK_DEFENSE" | "DIVERSIFICATION" | "TAX_LOSS_HARVESTING" | "SIP_STRATEGY"
5. Action Checklist: Every card MUST provide 2 to 3 concrete, distinct "action_steps" that guide the user on what practical steps they can take next.
6. Output format: Respond ONLY with a valid JSON object matching the requested schema. No markdown formatting outside the JSON, no commentary.
"""

def build_user_prompt(context: dict) -> str:
    import json
    return f"""
Analyze the following portfolio context and generate an explainable, highly actionable portfolio intelligence report:

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
      "action_type": "PORTFOLIO_REBALANCE" | "PROFIT_BOOKING" | "RISK_DEFENSE" | "DIVERSIFICATION" | "TAX_LOSS_HARVESTING" | "SIP_STRATEGY",
      "title": "<Concise descriptive title>",
      "summary": "<Short explanation highlighting the exact holding or sector>",
      "rationale": "<Step-by-step reasoning referencing specific numbers from analytics>",
      "action_steps": [
        "<Concrete actionable step 1 for the investor>",
        "<Concrete actionable step 2 for the investor>",
        "<Concrete actionable step 3 for the investor>"
      ],
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
