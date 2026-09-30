import re
from typing import Dict, Any

class IntentRouter:
    """
    Deterministic Intent Router classifying user queries into operational categories:
    KNOWLEDGE, CURRENT_STATE, WHAT_IF, B2B, MARKETING, RISK, GENERAL_OPERATIONAL.
    """

    INTENT_PATTERNS = [
        ("WHAT_IF", [
            r"what\s+if", r"increase.*by", r"decrease.*by", r"expand.*by",
            r"add\s+\d+", r"what\s+happens\s+if", r"simulate", r"co-manufacturing\s+increases"
        ]),
        ("B2B", [
            r"b2b", r"onboard", r"client", r"customer", r"restaurant", r"hotel",
            r"contract", r"sla", r"hypermarket", r"account"
        ]),
        ("MARKETING", [
            r"marketing", r"ad\s+spend", r"roas", r"campaign", r"promote",
            r"pune", r"mumbai\s+marketing", r"spend", r"advertis"
        ]),
        ("RISK", [
            r"risk", r"safe\s+mode", r"aggressive", r"p10", r"p90", r"uncertainty", r"confidence\s+interval"
        ]),
        ("CURRENT_STATE", [
            r"why.*shortage", r"current\s+shortage", r"why.*mumbai", r"why.*b2b", r"why.*allocation",
            r"why.*prioritize", r"why.*choose", r"current\s+status", r"today", r"this\s+month"
        ]),
        ("KNOWLEDGE", [
            r"what\s+is", r"define", r"explain\s+strategy", r"balanced\s+strategy", r"balanced\s+mode",
            r"what\s+assumptions", r"policy", r"how\s+does.*work", r"methodology", r"wape"
        ])
    ]

    @classmethod
    def classify_intent(cls, query: str) -> str:
        q = query.lower().strip()

        for intent, patterns in cls.INTENT_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, q):
                    return intent

        # Fallback heuristic
        if "?" in q or "how" in q or "what" in q:
            return "KNOWLEDGE"

        return "GENERAL_OPERATIONAL"
