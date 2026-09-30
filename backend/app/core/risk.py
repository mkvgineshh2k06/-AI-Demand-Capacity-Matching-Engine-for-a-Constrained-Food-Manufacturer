import copy
from app.core.capacity import evaluate_capacity
from app.core.optimizer import allocate_capacity

def generate_risk_plan(forecast_result: dict, capacity_record: dict, strategy: str = "balanced") -> dict:
    # 1. Derive Demand Uncertainty Bounds
    wape = forecast_result.get("metrics", {}).get("wape", 0.20)
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
        sg_ag["forecast_demand_kg"] = pt
        ag_segs.append(sg_ag)
        total_agg += pt
        
        # BALANCED: point + half upside buffer
        sg_bal = copy.deepcopy(s)
        sg_bal["forecast_demand_kg"] = pt + ((ub - pt) / 2.0)
        bal_segs.append(sg_bal)
        total_bal += sg_bal["forecast_demand_kg"]
        
        # SAFE: plan against full upper confidence bound
        sg_safe = copy.deepcopy(s)
        sg_safe["forecast_demand_kg"] = ub
        safe_segs.append(sg_safe)
        total_safe += ub

    # 2. Derive Capacity Uncertainty Bounds
    c_eval = evaluate_capacity(forecast_result, capacity_record)
    cap_unc = c_eval.get("capacity_uncertainty", {})
    
    expected_cap = c_eval.get("available_capacity_kg", cap_unc.get("expected_capacity_kg", 0.0))
    conservative_cap = cap_unc.get("conservative_capacity_kg", expected_cap * 0.9)
    optimistic_cap = cap_unc.get("optimistic_capacity_kg", expected_cap * 1.07)
        
    # 3. Determine Plans (Combined Demand + Capacity Uncertainty)
    # Aggressive: Point Demand vs Expected Capacity
    # Balanced: Balanced Demand vs Expected Capacity
    # Safe: Upper-Bound Demand vs Conservative Capacity (Lower Capacity Estimate)
    ag_plan = allocate_capacity(strategy, expected_cap, ag_segs)
    bal_plan = allocate_capacity(strategy, expected_cap, bal_segs)
    safe_plan = allocate_capacity(strategy, conservative_cap, safe_segs)
    
    # 4. Categorize Risk & Shortage Gap Matrix
    risk_level = "LOW"
    risk_factors = []
    
    expected_shortage = bal_plan['unfulfilled_demand_kg']
    conservative_shortage = safe_plan['unfulfilled_demand_kg']
    optimistic_shortage = ag_plan['unfulfilled_demand_kg']

    b2b_shortfalls_safe = sum(sf['shortfall_kg'] for sf in safe_plan.get('commitment_shortfalls', []))
    b2b_shortfalls_bal = sum(sf['shortfall_kg'] for sf in bal_plan.get('commitment_shortfalls', []))
    
    if b2b_shortfalls_bal > 0 or b2b_shortfalls_safe > 0:
        risk_level = "CRITICAL"
        risk_factors.append(f"CRITICAL: Structural B2B commitment deficit ({round(b2b_shortfalls_safe, 2)}kg under conservative capacity & upper demand bound).")
        
    elif safe_plan['unfulfilled_demand_kg'] > 0:
        if bal_plan['unfulfilled_demand_kg'] > 0:
            risk_level = "HIGH"
            risk_factors.append(f"HIGH: Capacity shortage ({round(expected_shortage, 2)}kg expected, {round(conservative_shortage, 2)}kg safe-case) under both BALANCED and SAFE bounds.")
        else:
            risk_level = "MEDIUM"
            risk_factors.append(f"MEDIUM: Shortages ({round(conservative_shortage, 2)}kg) isolated exclusively to conservative capacity & worst-case SAFE projection.")
    else:
        risk_level = "LOW"
        risk_factors.append("LOW: Ample production capacity accommodates upper-boundary demand even under conservative capacity estimates.")
        
    return {
        "forecast_interval": interval_info,
        "capacity_uncertainty": cap_unc,
        "gap_matrix": {
            "expected_shortage_kg": round(expected_shortage, 2),
            "conservative_shortage_kg": round(conservative_shortage, 2),
            "optimistic_shortage_kg": round(optimistic_shortage, 2),
        },
        "plans": {
            "aggressive": ag_plan,
            "balanced": bal_plan,
            "safe": safe_plan
        },
        "risk_level": risk_level,
        "risk_factors": risk_factors
    }

