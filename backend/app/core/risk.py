import copy
from app.core.capacity import evaluate_capacity
from app.core.optimizer import allocate_capacity

def generate_risk_plan(forecast_result: dict, capacity_record: dict, strategy: str = "balanced") -> dict:
    # 1. Derive Uncertainty Bounds
    # Using 80% confidence conformal approx margin (Normal dist ~ 1.28 * Error)
    wape = forecast_result.get("metrics", {}).get("wape", 0.20)
    # Put a safe floor to ensure even "perfect" models simulate some risk
    wape = max(wape, 0.05)
    margin_pct = wape * 1.28 
    
    interval_info = {}
    base_segs = forecast_result.get("segments", [])
    
    ag_segs = []
    bal_segs = []
    safe_segs = []
    
    total_agg = 0
    total_bal = 0
    total_safe = 0
    
    for s in base_segs:
        pt = float(s.get("forecast_quantity_kg", 0.0))
        ub = pt * (1.0 + margin_pct)
        lb = max(0.0, pt * (1.0 - margin_pct))
        
        interval_info[f"{s.get('region', '')}_{s.get('channel', '')}"] = {
            "point_forecast_kg": round(pt, 2),
            "lower_bound_kg": round(lb, 2),
            "upper_bound_kg": round(ub, 2),
            "confidence_level": "80%"
        }
        
        # AGGRESSIVE: use point forecast as demand
        sg_ag = copy.deepcopy(s)
        sg_ag["forecast_demand_kg"] = pt  # Ensure optimizer key is always set
        ag_segs.append(sg_ag)
        total_agg += pt
        
        # BALANCED: point + half the upside uncertainty buffer
        sg_bal = copy.deepcopy(s)
        sg_bal["forecast_demand_kg"] = pt + ((ub - pt) / 2.0)
        bal_segs.append(sg_bal)
        total_bal += sg_bal["forecast_demand_kg"]
        
        # SAFE: plan against the full upper confidence bound
        sg_safe = copy.deepcopy(s)
        sg_safe["forecast_demand_kg"] = ub
        safe_segs.append(sg_safe)
        total_safe += ub

    avail_cap = capacity_record.get('available_capacity_kg')
    if avail_cap is None:
        c_eval = evaluate_capacity(forecast_result, capacity_record)
        avail_cap = c_eval['available_capacity_kg']
        
    # 2. Determine Plans (Optimize against demand assumptions)
    ag_plan = allocate_capacity(strategy, avail_cap, ag_segs)
    bal_plan = allocate_capacity(strategy, avail_cap, bal_segs)
    safe_plan = allocate_capacity(strategy, avail_cap, safe_segs)
    
    # 3. Categorize Risk
    risk_level = "LOW"
    risk_factors = []
    
    # Analyze Safe Plan vulnerabilities
    b2b_shortfalls = sum(sf['shortfall_kg'] for sf in safe_plan['commitment_shortfalls'])
    
    if b2b_shortfalls > 0:
        risk_level = "CRITICAL"
        risk_factors.append(f"CRITICAL: Structural B2B commitment deficit of {round(b2b_shortfalls, 2)}kg under safety upper-bound demand.")
        
    elif safe_plan['unfulfilled_demand_kg'] > 0:
        if bal_plan['unfulfilled_demand_kg'] > 0:
            risk_level = "HIGH"
            risk_factors.append(f"HIGH: Unfulfilled general demand triggered under both BALANCED and SAFE boundaries.")
        else:
            risk_level = "MEDIUM"
            risk_factors.append(f"MEDIUM: Shortages isolated exclusively to worst-case SAFE projection. Typical capacity is sufficient.")
    else:
        risk_level = "LOW"
        risk_factors.append("LOW: Ample production capacity accommodates even 80% confidence interval upper-boundary demand safely.")
        
    return {
        "forecast_interval": interval_info,
        "plans": {
            "aggressive": ag_plan,
            "balanced": bal_plan,
            "safe": safe_plan
        },
        "risk_level": risk_level,
        "risk_factors": risk_factors
    }
