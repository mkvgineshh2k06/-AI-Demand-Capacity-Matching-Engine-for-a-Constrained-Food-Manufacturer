def generate_recommendations(plan: dict, capacity_gap: dict, risk: dict, marketing: dict) -> list:
    recommendations = []
    
    # 1. Evaluate Shortages
    shortage = capacity_gap.get('shortage_kg', 0.0)
    if shortage > 0.0:
        recommendations.append({
            "type": "ACTIVATE_CO_MANUFACTURING",
            "priority": "HIGH",
            "title": "Address Capacity Shortfall",
            "reason": f"Projected demand exceeds usable capacity by {round(shortage, 2)} kg. Activating available co-manufacturing capacity or deferring downtime would reduce this projected shortage.",
            "estimated_impact": {"shortage_reduction_kg": round(shortage, 2)}
        })
        
    # 2. Evaluate B2B Commitments & Risks
    if risk.get('level') in ['CRITICAL', 'HIGH']:
        shortfalls = sum(sf.get('shortfall_kg', 0.0) for sf in plan.get('commitment_shortfalls', []))
        if shortfalls > 0.0:
            recommendations.append({
                "type": "PROTECT_B2B_COMMITMENTS",
                "priority": "CRITICAL",
                "title": "B2B Insolvency Risk",
                "reason": f"Minimum guaranteed commitments are failing by {round(shortfalls, 2)} kg under current configuration. Immediate intervention required to avoid contract breaches.",
                "estimated_impact": {"b2b_shortfall_kg": round(shortfalls, 2)}
            })
        else:
            recommendations.append({
                "type": "REVIEW_HIGH_RISK_FORECAST",
                "priority": "MEDIUM",
                "title": "High Margin Forecasting Risk",
                "reason": "While standard plans fit, worst-case confidence bounds heavily trigger capacity deficits. Re-evaluating inventory buffer is recommended.",
                "estimated_impact": {}
            })
            
    # 3. Evaluate Marketing Reallocations
    if marketing:
        alloc_out = [s for s in marketing.get('segments', []) if 'REALLOCATE_OUT' in s['action'] or 'REDUCE' in s['action']]
        alloc_in = [s for s in marketing.get('segments', []) if 'REALLOCATE_IN' in s['action'] or 'INCREASE' in s['action']]
        
        amt_shifted = sum(abs(s['suggested_spend_change_inr']) for s in alloc_out)
        
        if amt_shifted > 0.0:
            if alloc_in:
                recommendations.append({
                    "type": "REALLOCATE_MARKETING",
                    "priority": "MEDIUM",
                    "title": "Shift Marketing Spend Away from Bottlenecks",
                    "reason": f"Shifting ₹{round(amt_shifted, 0):,.0f} from chronically out-of-stock segments into high-capacity, high-fulfillment zones to optimize ROAS.",
                    "estimated_impact": {"shifted_budget_inr": round(amt_shifted, 2)}
                })
            else:
                recommendations.append({
                    "type": "REDUCE_MARKETING",
                    "priority": "HIGH",
                    "title": "Halt Inefficient Demand Generation",
                    "reason": f"Cutting ₹{round(amt_shifted, 0):,.0f} in marketing spend for segments lacking supply capacity. Eliminates wasted customer acquisition cost.",
                    "estimated_impact": {"saved_budget_inr": round(amt_shifted, 2)}
                })
                
    # 4. Check smooth operation
    if not recommendations:
        recommendations.append({
            "type": "MAINTAIN_CURRENT_PLAN",
            "priority": "LOW",
            "title": "Operational Grid Stable",
            "reason": "Current strategy balances demand, capacity, and marketing budgets safely bounding all thresholds successfully.",
            "estimated_impact": {}
        })

    return recommendations
