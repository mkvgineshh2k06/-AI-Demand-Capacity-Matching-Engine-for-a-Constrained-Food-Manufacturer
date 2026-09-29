import copy
from app.core.optimizer import allocate_capacity

def evaluate_new_b2b_account(new_account: dict, available_capacity_kg: float, segments: list, strategy: str = "balanced") -> dict:
    # 1. Baseline allocation (Without New Account)
    baseline_res = allocate_capacity(strategy, available_capacity_kg, segments)
    baseline_b2b_pct = baseline_res['b2b_fulfillment_pct']
    
    base_b2b_shortfalls = sum(sf['shortfall_kg'] for sf in baseline_res['commitment_shortfalls'])
    
    # 2. Add proposed account
    new_req = float(new_account.get('monthly_requirement_kg', 0.0))
    min_pct = float(new_account.get('minimum_fulfillment_pct', 95.0))
    
    new_seg = {
        'segment_id': new_account.get('customer_name', 'NEW_B2B_EVAL'),
        'region': new_account.get('region', 'Unknown'),
        'channel': 'B2B',
        'forecast_demand_kg': new_req,
        'unit_price_inr': float(new_account.get('unit_price_inr', 0.0)),
        'minimum_commitment_kg': new_req, # For feasibility, the requested req operates as the commitment constraint
        'priority': new_account.get('priority', 'HIGH')
    }
    if 'variable_cost_inr' in new_account:
        new_seg['variable_cost_inr'] = float(new_account['variable_cost_inr'])
        
    combined_segments = segments + [new_seg]
    
    # Helper to assess if a scenario meets strict feasibility
    def is_scenario_feasible(sim_res):
        # Did the new account get the expected fulfillment?
        new_res = next((s for s in sim_res['segments'] if s['segment_id'] == new_seg['segment_id']), None)
        f_pct = new_res['fulfillment_pct'] if new_res else 0.0
        
        # Did existing B2B fulfillment drop?
        # Calculate existing B2B fulfillment
        ex_b2b_demand = sum(s.get('forecast_demand_kg', 0) for s in segments if s.get('channel') == 'B2B')
        ex_b2b_alloc = sum(s['allocated_kg'] for s in sim_res['segments'] if s['segment_id'] != new_seg['segment_id'] and s['channel'] == 'B2B')
        ex_b2b_pct = (ex_b2b_alloc / ex_b2b_demand * 100.0) if ex_b2b_demand > 0 else 100.0
        
        # Did shortfalls worsen?
        ex_shortfalls = sum(sf['shortfall_kg'] for sf in sim_res['commitment_shortfalls'] if sf['segment_id'] != new_seg['segment_id'])
        
        cond_new_account = (f_pct >= min_pct - 0.01)
        cond_existing_b2b = (ex_b2b_pct >= baseline_b2b_pct - 0.01)
        cond_shortfalls = (ex_shortfalls <= base_b2b_shortfalls + 0.01)
        
        return cond_new_account and cond_existing_b2b and cond_shortfalls, f_pct, ex_b2b_pct
    
    # 3. Simulate immediately at 0 extra capacity
    sim_baseline = allocate_capacity(strategy, available_capacity_kg, combined_segments)
    feasible_zero, new_pct_0, ex_b2b_0 = is_scenario_feasible(sim_baseline)
    
    rev_change = sim_baseline['expected_revenue_inr'] - baseline_res['expected_revenue_inr']
    capacity_deficit = max(0.0, sim_baseline['unfulfilled_demand_kg'] - baseline_res['unfulfilled_demand_kg'])
    
    min_extra_cap = 0.0
    feasibility = "NOT_FEASIBLE"
    reasons = []
    
    if feasible_zero:
        feasibility = "FEASIBLE"
        reasons.append("Current available capacity fully supports the new account without harming existing B2B commitments.")
    else:
        # Binary search for min extra capacity
        low = 0.0
        high = max(1000.0, new_req * 5)
        # Verify if high is feasible
        test_high = allocate_capacity(strategy, available_capacity_kg + high, combined_segments)
        ok_high, _, _ = is_scenario_feasible(test_high)
        
        if not ok_high:
            feasibility = "NOT_FEASIBLE"
            reasons.append("New account disrupts existing commitments, or demands capacity additions exceeding practical bounds/prices.")
        else:
            best_valid = high
            for _ in range(30): # 30 steps of binary search is extremely precise
                mid = (low + high) / 2.0
                test_mid = allocate_capacity(strategy, available_capacity_kg + mid, combined_segments)
                ok_mid, _, _ = is_scenario_feasible(test_mid)
                
                if ok_mid:
                    best_valid = mid
                    high = mid
                else:
                    low = mid
                    
            min_extra_cap = round(best_valid, 2)
            
            # Re-evaluate with exact binary search bound to lock in variables safely
            # Cap realistic "conditional" scaling at 200% of current available structural capacity
            if min_extra_cap <= available_capacity_kg * 2.0:
                feasibility = "CONDITIONALLY_FEASIBLE"
                reasons.append(f"Account is feasible if {min_extra_cap}kg of additional capacity (e.g. co-manufacturing) is secured.")
            else:
                feasibility = "NOT_FEASIBLE"
                reasons.append(f"Account requires {min_extra_cap}kg extra capacity which heavily offsets structural constraints.")
                
            # Grab the actual fulfillment states at best_valid capacity
            sim_baseline = allocate_capacity(strategy, available_capacity_kg + min_extra_cap, combined_segments)
            _, new_pct_0, ex_b2b_0 = is_scenario_feasible(sim_baseline)

    if min_extra_cap > 0:
        spare = 0.0
    else:
        spare = max(0.0, available_capacity_kg - sim_baseline['total_allocated_kg'])
        
    return {
        "feasibility": feasibility,
        "new_account_fulfillment_pct": round(new_pct_0, 2),
        "current_spare_capacity_kg": round(spare, 2),
        "capacity_deficit_kg": round(capacity_deficit, 2),
        "minimum_extra_capacity_required_kg": round(min_extra_cap, 2),
        "revenue_change_inr": round(rev_change, 2),
        "existing_b2b_fulfillment_before": round(baseline_b2b_pct, 2),
        "existing_b2b_fulfillment_after": round(ex_b2b_0, 2),
        "recommendation": "Accept Contract" if feasibility == "FEASIBLE" else ("Negotiate Capacity Addition" if feasibility == "CONDITIONALLY_FEASIBLE" else "Reject Contract"),
        "reasons": reasons
    }
