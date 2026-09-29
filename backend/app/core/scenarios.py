import copy
from app.core.capacity import evaluate_capacity
from app.core.optimizer import allocate_capacity

def simulate_scenario(baseline_forecast: dict, baseline_capacity: dict, segments: list, scenario_changes: dict, strategy: str = "balanced") -> dict:
    warnings = []
    
    # 1. Deepcopy safely to prevent mutation
    s_forecast = copy.deepcopy(baseline_forecast)
    s_cap = copy.deepcopy(baseline_capacity)
    s_segs = copy.deepcopy(segments)
    
    # 2. Modify capacity
    s_cap['internal_capacity_kg'] += float(scenario_changes.get('additional_internal_capacity_kg', 0.0))
    s_cap['co_manufacturing_capacity_kg'] += float(scenario_changes.get('additional_co_manufacturing_capacity_kg', 0.0))
    s_cap['downtime_kg'] += float(scenario_changes.get('downtime_change_kg', 0.0))
    s_cap['reserved_capacity_kg'] += float(scenario_changes.get('reserved_capacity_change_kg', 0.0))
    
    # 3. Modify Demands & Segments
    total_new_demand = 0.0
    
    # Apply standard shifts over segments
    global_growth = float(scenario_changes.get('demand_growth_pct', 0.0))
    reg_growth = scenario_changes.get('region_specific_demand_growth', {})
    chan_growth = scenario_changes.get('channel_specific_demand_growth', {})
    mkt_changes = scenario_changes.get('marketing_spend_changes', {})
    
    for seg in s_segs:
        base_demand = float(seg.get('forecast_demand_kg', 0.0))
        
        # Accumulate growth multipliers
        mult = 1.0 + (global_growth / 100.0)
        
        reg = seg.get('region')
        if reg in reg_growth:
            mult += (float(reg_growth[reg]) / 100.0)
            
        chan = seg.get('channel')
        if chan in chan_growth:
            mult += (float(chan_growth[chan]) / 100.0)
            
        new_demand = base_demand * max(0.0, mult)
        
        # Marketing spend elasticity fallback (fallback logic because we don't have the raw ML module injected dynamically)
        # Assuming elasticity of 0.05 kg per INR added/removed as a fallback.
        mkt_key = f"{reg}_{chan}"
        if mkt_key in mkt_changes:
            delta_spend = float(mkt_changes[mkt_key])
            # A documented fallback model-less assumption
            mkt_lift = delta_spend * 0.05
            new_demand = max(0.0, new_demand + mkt_lift)
            warnings.append(f"Used static fallback elasticity (0.05kg/INR) for {mkt_key} marketing scenario. Connect ML forecaster for precise predictions.")
            
        seg['forecast_demand_kg'] = new_demand
    
    # Add new B2B account if present
    new_b2b = scenario_changes.get('new_b2b_account')
    if new_b2b:
        qty = float(new_b2b.get('requested_monthly_quantity', 0.0))
        s_segs.append({
            'segment_id': new_b2b.get('segment_id', 'NEW_B2B_TEMP'),
            'region': new_b2b.get('region', 'Unknown'),
            'channel': 'B2B',
            'forecast_demand_kg': qty,
            'unit_price_inr': float(new_b2b.get('unit_price', 0.0)),
            'minimum_commitment_kg': float(new_b2b.get('minimum_commitment', 0.0)),
            'priority': new_b2b.get('priority', 'MEDIUM')
        })
        
    s_forecast["total_demand_kg"] = sum(s.get('forecast_demand_kg', 0.0) for s in s_segs)
    
    # 4. Re-run evaluations natively
    new_cap_eval = evaluate_capacity(s_forecast, s_cap)
    
    # 5. Re-run optimizer logic natively
    avail_cap = new_cap_eval['available_capacity_kg']
    
    # To compare properly, we need a baseline allocation to check baseline revenue / fulfillment properly
    # If the caller doesn't provide baseline allocation, we quickly reconstruct it for baseline impact comparison
    # However we'll assume baseline_forecast dict has these tracking fields or we evaluate the baseline!
    base_cap_eval = evaluate_capacity(baseline_forecast, baseline_capacity)
    base_alloc = allocate_capacity(strategy, base_cap_eval['available_capacity_kg'], segments)
    
    new_alloc = allocate_capacity(strategy, avail_cap, s_segs)
    warnings.extend(new_cap_eval.get('warnings', []))
    warnings.extend(new_alloc.get('explanations', []))  # Merge optimizer explanations as context
    
    # 6. Extract impacts safely
    b_demand = base_cap_eval['forecast_demand_kg']
    b_cap = base_cap_eval['available_capacity_kg']
    b_short = base_cap_eval['shortage_kg']
    b_rev = base_alloc['expected_revenue_inr']
    b_fulfill = base_alloc['overall_fulfillment_pct']
    
    n_demand = new_cap_eval['forecast_demand_kg']
    n_cap = new_cap_eval['available_capacity_kg']
    n_short = new_cap_eval['shortage_kg']
    n_rev = new_alloc['expected_revenue_inr']
    n_fulfill = new_alloc['overall_fulfillment_pct']
    
    impact = {
        "demand_change_kg": round(n_demand - b_demand, 2),
        "capacity_change_kg": round(n_cap - b_cap, 2),
        "shortage_change_kg": round(n_short - b_short, 2),
        "revenue_change_inr": round(n_rev - b_rev, 2),
        "fulfillment_change_pct_points": round(n_fulfill - b_fulfill, 2)
    }
    
    # Optional deduping of warnings safely
    warnings = list(dict.fromkeys(warnings))
    
    return {
        "baseline": {
            "demand_kg": b_demand,
            "capacity_kg": b_cap,
            "shortage_kg": b_short,
            "revenue_inr": b_rev,
            "fulfillment_pct": b_fulfill
        },
        "scenario": {
            "demand_kg": n_demand,
            "capacity_kg": n_cap,
            "shortage_kg": n_short,
            "revenue_inr": n_rev,
            "fulfillment_pct": n_fulfill
        },
        "impact": impact,
        "updated_allocation": new_alloc,
        "warnings": warnings
    }
