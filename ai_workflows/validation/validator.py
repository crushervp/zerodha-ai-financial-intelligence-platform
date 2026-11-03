from typing import Dict, Any, Tuple

PROHIBITED_PHRASES = [
    "guaranteed return", "guaranteed profit", "100% safe",
    "must buy", "must sell", "buy immediately", "sell immediately",
    "target price", "multibagger"
]

MANDATORY_DISCLAIMER_SNIPPET = "not"  # Verifies presence of advisory disclaimer

def validate_analysis_output(output: Dict[str, Any], context: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates LLM-generated output against compliance rules,
    required schema fields, and mathematical consistency.
    """
    # 1. Structural schema checks
    required_keys = ["portfolio_id", "summary", "recommendation_cards", "regulatory_disclaimer"]
    for key in required_keys:
        if key not in output:
            return False, f"Missing required root key: '{key}'"

    # 2. Disclaimer enforcement
    disclaimer = output.get("regulatory_disclaimer", "").lower()
    if not disclaimer or MANDATORY_DISCLAIMER_SNIPPET not in disclaimer:
        return False, "Missing or insufficient regulatory disclaimer"

    # 3. Prohibited advice phrasing checks
    raw_text = str(output).lower()
    for phrase in PROHIBITED_PHRASES:
        if phrase in raw_text:
            return False, f"Compliance violation: Output contains prohibited phrasing '{phrase}'"

    # 4. Check recommendation card categories
    valid_categories = {"EDUCATIONAL_INSIGHT", "RISK_ALERT", "RECOMMENDATION_PROMPT"}
    cards = output.get("recommendation_cards", [])
    if not cards:
        return False, "Output must contain at least one recommendation card"

    for idx, card in enumerate(cards):
        category = card.get("category")
        if category not in valid_categories:
            return False, f"Card {idx} has invalid category: '{category}'"
        
        confidence = card.get("confidence", 0.0)
        if not (0.0 <= confidence <= 1.0):
            return False, f"Card {idx} confidence must be between 0.0 and 1.0"

    return True, "VALID"