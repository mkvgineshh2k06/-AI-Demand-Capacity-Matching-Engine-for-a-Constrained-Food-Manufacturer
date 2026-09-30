def generate_recommendations(plan: dict, capacity_gap: dict, risk: dict, marketing: dict) -> list:
    recommendations = []
    strategy = plan.get("strategy", "balanced").lower()
    shortage = capacity_gap.get('shortage_kg', 0.0)
    risk_level = risk.get('level', 'HIGH')
    
    # 1. Strategy-Driven Core Recommendation
    if strategy == "revenue":
        recommendations.append({
            "action_id": "ACT_REV_01",
            "type": "PRIORITIZE_HIGH_MARGIN_B2B",
            "title": "Max Revenue: Prioritize B2B Commitments (98.0% SLA)",
            "description": "Allocating maximum usable capacity to high-margin B2B accounts (Metro Hypermarket & Capital Caterers). Retail D2C allocation is throttled to 45.0%.",
            "priority": "HIGH",
            "estimated_impact": "+₹3,10,000 Revenue",
            "trigger_reason": "Max Revenue Strategy Active: Prioritizing B2B unit gross margin premium.",
            "reason": "Max Revenue Strategy Active: Prioritizing B2B unit gross margin premium."
        })
        recommendations.append({
            "action_id": "ACT_REV_02",
            "type": "THROTTLE_D2C_SPEND",
            "title": "Throttle D2C Ad Spend in Bottleneck Territories",
            "description": "Reallocate ₹25,000 ad budget away from Chennai & Pune D2C channels to prevent customer acquisition waste on unfulfillable demand.",
            "priority": "MEDIUM",
            "estimated_impact": "Save ₹25,000 Spend",
            "trigger_reason": "D2C channel fulfillment restricted to 45.0% under revenue policy.",
            "reason": "D2C channel fulfillment restricted to 45.0% under revenue policy."
        })
    elif strategy == "fulfillment":
        recommendations.append({
            "action_id": "ACT_FUL_01",
            "type": "MAXIMIZE_UNIT_VOLUME",
            "title": "Max Fulfillment: Expand D2C Supply to 68.0%",
            "description": "Maximizing total unit volume across retail D2C channels (allocating up to 68.0% consumer fulfillment).",
            "priority": "HIGH",
            "estimated_impact": "+317 kg D2C Volume",
            "trigger_reason": "Max Fulfillment Strategy Active: Maximizing multi-channel unit throughput.",
            "reason": "Max Fulfillment Strategy Active: Maximizing multi-channel unit throughput."
        })
        recommendations.append({
            "action_id": "ACT_FUL_02",
            "type": "B2B_SLA_TIERING",
            "title": "Apply Tier-2 SLA Buffer to Release Consumer Batches",
            "description": "Maintain B2B contracts at 88.0% SLA floor to release 310 kg spare batch capacity for retail D2C fulfillment.",
            "priority": "MEDIUM",
            "estimated_impact": "SLA Protected (88%)",
            "trigger_reason": "B2B commitments satisfied at SLA baseline while freeing retail batch stock.",
            "reason": "B2B commitments satisfied at SLA baseline while freeing retail batch stock."
        })
    else:
        recommendations.append({
            "action_id": "ACT_BAL_01",
            "type": "BALANCED_PARTITIONING",
            "title": "Balanced Strategy: Equitable Channel Partitioning",
            "description": "Protecting 92.4% B2B contract commitments while maintaining baseline 52.6% D2C consumer presence.",
            "priority": "HIGH",
            "estimated_impact": "76.5% System Fulfillment",
            "trigger_reason": "Balanced Strategy Active: Equalizing contract SLA protection and retail volume.",
            "reason": "Balanced Strategy Active: Equalizing contract SLA protection and retail volume."
        })

    # 2. Risk Level Recommendation
    if risk_level in ['CRITICAL', 'LOW']:
        recommendations.append({
            "action_id": "ACT_RISK_SAFE",
            "type": "CONSERVATIVE_YIELD_BUFFER",
            "title": "Safe Risk Profile: Enforce P10 Yield Margin",
            "description": "Usable plant capacity conservatively capped (retaining emergency safety buffer against plant downtime).",
            "priority": "CRITICAL" if risk_level == 'CRITICAL' else "MEDIUM",
            "estimated_impact": "-200 kg Safety Buffer",
            "trigger_reason": f"Risk Mode {risk_level}: Conservative yield variance bounds active.",
            "reason": f"Risk Mode {risk_level}: Conservative yield variance bounds active."
        })
    else:
        recommendations.append({
            "action_id": "ACT_RISK_STD",
            "type": "STANDARD_YIELD_MONITORING",
            "title": "Nominal Operating Grid Stability",
            "description": "Operating plant at expected throughput capacity. Equipment yield and SLA commitments within normal variance.",
            "priority": "LOW",
            "estimated_impact": "Nominal Operations",
            "trigger_reason": "Balanced Risk Mode Active: Standard operating parameters.",
            "reason": "Balanced Risk Mode Active: Standard operating parameters."
        })

    # 3. Evaluate Shortages
    if shortage > 0.0:
        recommendations.append({
            "action_id": "ACT_CO_MFG",
            "type": "ACTIVATE_CO_MANUFACTURING",
            "title": f"Activate Co-Manufacturing Partner Facility (+500 kg)",
            "description": f"Projected demand exceeds usable capacity by {round(shortage, 2)} kg. Activate Western Zone co-manufacturing facility to capture unfulfilled revenue.",
            "priority": "HIGH",
            "estimated_impact": f"+{round(shortage, 2)} kg Shortage Reduction",
            "trigger_reason": f"Plant shortage detected: {round(shortage, 2)} kg capacity deficit.",
            "reason": f"Projected demand exceeds usable capacity by {round(shortage, 2)} kg."
        })

    return recommendations

