from ortools.linear_solver import pywraplp

def allocate_capacity(strategy, available_capacity_kg, segments):
    # Initialize Solver
    solver = pywraplp.Solver.CreateSolver('GLOP')
    if not solver:
        raise RuntimeError("OR-Tools GLOP solver unavailable.")

    # Data structures
    allocations = {}
    shortfalls = {}
    
    # Calculate normalization maxes for 'balanced' strategy
    max_margin = 1.0
    max_f_weight = 1.0
    f_weights = {}
    margins = {}
    
    for i, seg in enumerate(segments):
        # Margin
        margin = float(seg.get('unit_price_inr', 0.0) - seg.get('variable_cost_inr', 0.0))
        margins[i] = max(margin, 0.0) # Assume 0 bound to protect against negative margins
        if margins[i] > max_margin:
            max_margin = margins[i]
            
        # Service Weight
        ch = seg.get('channel', 'D2C').upper()
        prio = seg.get('priority', 'LOW').upper()
        min_commit = float(seg.get('minimum_commitment_kg', 0.0))
        
        weight = 20.0
        if ch == 'B2B':
            if prio == 'HIGH': weight = 100.0
            elif prio == 'MEDIUM': weight = 50.0
            else: weight = 10.0
            if min_commit > 0:
                weight += 50.0
        f_weights[i] = weight
        if weight > max_f_weight:
            max_f_weight = weight
            
    # Decision Variables and Constraints
    for i, seg in enumerate(segments):
        demand = float(seg.get('forecast_demand_kg', 0.0))
        # 2. allocation_i <= forecast_demand_i; 3. allocation_i >= 0
        allocations[i] = solver.NumVar(0, demand, f"alloc_{i}")
        
        seg_ch = seg.get('channel', 'D2C').upper()  # Scoped per-segment — fixes ch bleed bug
        min_commit = float(seg.get('minimum_commitment_kg', 0.0))
        if seg_ch == 'B2B' and min_commit > 0:
            # Shortfall variables handle infeasibility if commitments > capacity
            shortfalls[i] = solver.NumVar(0, min_commit, f"shortfall_{i}")
            # allocation_i + shortfall_i >= required_commitment_i
            solver.Add(allocations[i] + shortfalls[i] >= min_commit)

    # 1. sum(allocation_i) <= available_capacity
    solver.Add(solver.Sum([allocations[i] for i in range(len(segments))]) <= float(available_capacity_kg))
    
    # Objective Formulation
    objective = solver.Objective()
    
    for i, seg in enumerate(segments):
        margin = margins[i]
        f_weight = f_weights[i]
        
        if strategy == "revenue":
            coeff = margin
        elif strategy == "fulfillment":
            coeff = f_weight
        else: # "balanced"
            w_eco = (margin / max_margin) * 50.0
            w_srv = (f_weight / max_f_weight) * 50.0
            coeff = w_eco + w_srv
            
        objective.SetCoefficient(allocations[i], coeff)
        
        # Penalize B2B shortfalls heavily in all strategies to enforce commitment matching unless impossible
        if i in shortfalls:
            penalty = coeff * 10.0 # Strongly penalize shortfall
            objective.SetCoefficient(shortfalls[i], -penalty)
            
    objective.SetMaximization()
    
    # Solve
    status = solver.Solve()
    
    if status not in [pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE]:
        raise ValueError("Optimizer could not find a feasible solution.")
        
    # Process Output
    results = []
    total_allocated = 0.0
    total_unfulfilled = 0.0
    expected_revenue = 0.0
    expected_margin = 0.0
    
    d2c_req, d2c_all = 0.0, 0.0
    b2b_req, b2b_all = 0.0, 0.0
    
    commitment_shortfalls = []
    
    for i, seg in enumerate(segments):
        alloc_val = allocations[i].solution_value()
        demand = float(seg.get('forecast_demand_kg', 0.0))
        
        # Guard floating point glitches
        if alloc_val < 1e-4: alloc_val = 0.0
        if alloc_val > demand: alloc_val = demand
        
        unfulfilled = demand - alloc_val
        fulfilled_pct = (alloc_val / demand * 100.0) if demand > 0 else 100.0
        
        rev = alloc_val * float(seg.get('unit_price_inr', 0.0))
        marg = alloc_val * margins[i]
        
        total_allocated += alloc_val
        total_unfulfilled += unfulfilled
        expected_revenue += rev
        expected_margin += marg
        
        ch = seg.get('channel', 'D2C').upper()
        if ch == 'D2C':
            d2c_req += demand
            d2c_all += alloc_val
        elif ch == 'B2B':
            b2b_req += demand
            b2b_all += alloc_val
            
        # Shortfall check
            if i in shortfalls:
                sf_val = shortfalls[i].solution_value()
                if sf_val > 1e-4:
                    commitment_shortfalls.append({
                        "segment_id": seg.get('segment_id', f'IDX_{i}'),
                        "shortfall_kg": round(sf_val, 2)
                    })
        
        # -------------------------------------------------------------
        # Deterministic Explanation per Allocation
        # -------------------------------------------------------------
        seg_reasons = []
        primary_code = "DEMAND_FULLY_SATISFIED"
        
        min_commit = float(seg.get('minimum_commitment_kg', 0.0))
        prio = seg.get('priority', 'LOW').upper()
        margin = margins[i]
        
        if fulfilled_pct >= 99.9:
            primary_code = "DEMAND_FULLY_SATISFIED"
            seg_reasons.append("Demand was fully satisfied by available capacity.")
            if ch == 'B2B':
                seg_reasons.append("B2B priority commitment fully honored.")
        elif alloc_val > 0:
            if ch == 'B2B' and min_commit > 0:
                primary_code = "B2B_COMMITMENT_PRIORITY"
                seg_reasons.append("High-priority B2B commitment constraint active.")
                if alloc_val < min_commit:
                    primary_code = "UNAVOIDABLE_SHORTFALL"
                    seg_reasons.append("Capacity insufficient to satisfy full B2B minimum commitment.")
                else:
                    seg_reasons.append("Minimum commitment constraint fully satisfied.")
            elif strategy == "revenue":
                primary_code = "HIGH_MARGIN_SEGMENT" if margin > 0 else "STRATEGY_REVENUE_PRIORITY"
                seg_reasons.append(f"Capacity allocated prioritized by contribution margin (₹{round(margin, 2)}/kg).")
            elif strategy == "fulfillment":
                primary_code = "STRATEGY_FULFILLMENT_PRIORITY"
                seg_reasons.append("Prioritized under high service fulfillment weight.")
            else: # balanced
                primary_code = "STRATEGY_BALANCED_TRADEOFF"
                seg_reasons.append("Capacity allocated balancing contribution margin and channel fulfillment priority.")
                
            if float(available_capacity_kg) < (total_allocated + total_unfulfilled):
                seg_reasons.append("Capacity is insufficient to fulfill total demand.")
        else: # alloc_val == 0
            if margin <= 0:
                primary_code = "LOW_MARGIN_UNDER_CONSTRAINT"
                seg_reasons.append("Zero allocation due to non-positive contribution margin under limited capacity.")
            else:
                primary_code = "LOWER_PRIORITY_SEGMENT"
                seg_reasons.append("Capacity fully utilized by higher-priority B2B or higher-margin segments.")

        results.append({
            "segment_id": seg.get('segment_id', f'IDX_{i}'),
            "region": seg.get('region', 'Unknown'),
            "channel": ch,
            "forecast_demand_kg": round(demand, 2),
            "allocated_kg": round(alloc_val, 2),
            "unfulfilled_kg": round(unfulfilled, 2),
            "fulfillment_pct": round(fulfilled_pct, 2),
            "allocation_revenue_inr": round(rev, 2),
            "explanation": {
                "primary_reason_code": primary_code,
                "reasons": seg_reasons
            }
        })
        
    overall_fulfillment = (total_allocated / (total_allocated + total_unfulfilled) * 100.0) if (total_allocated + total_unfulfilled) > 0 else 100.0
    b2b_fulfillment = (b2b_all / b2b_req * 100.0) if b2b_req > 0 else 100.0
    d2c_fulfillment = (d2c_all / d2c_req * 100.0) if d2c_req > 0 else 100.0
    utilization_pct = (total_allocated / float(available_capacity_kg) * 100.0) if float(available_capacity_kg) > 0 else 100.0

    # -------------------------------------------------------------
    # Binding Constraint Detection
    # -------------------------------------------------------------
    binding_constraints = []
    if utilization_pct >= 99.5 and total_unfulfilled > 0.1:
        binding_constraints.append("TOTAL_CAPACITY")
    if len(commitment_shortfalls) > 0:
        binding_constraints.append("B2B_MINIMUM_COMMITMENT_SHORTFALL")
    elif b2b_req > 0 and sum(float(s.get('minimum_commitment_kg', 0)) for s in segments if s.get('channel')=='B2B') > 0:
        binding_constraints.append("B2B_MINIMUM_COMMITMENT")
    if total_unfulfilled <= 0.01:
        binding_constraints.append("DEMAND_CEILING")

    # -------------------------------------------------------------
    # Strategy Explanation & Tradeoffs Generator
    # -------------------------------------------------------------
    tradeoffs = []
    if strategy == "revenue":
        strat_summary = "Revenue optimization prioritized segments strictly by unit contribution margin."
        if b2b_req > 0:
            tradeoffs.append("Higher allocation assigned to D2C high-margin segments over non-contract B2B volume.")
    elif strategy == "fulfillment":
        strat_summary = "Fulfillment strategy prioritized B2B SLAs and channel fulfillment weights to maximize total order completion."
        tradeoffs.append("Allocated capacity to high-priority commitments even when unit margin was lower.")
    else: # balanced
        strat_summary = "Balanced strategy traded off contribution margin against B2B contract fulfillment weights."
        tradeoffs.append("Maintained high B2B commitment reliability while preserving allocation for top-performing D2C markets.")

    # Legacy explanations array for backwards compatibility
    explanations = []
    total_commit = sum(s.get('minimum_commitment_kg', 0) for s in segments if s.get('channel') == 'B2B')
    
    if total_commit > float(available_capacity_kg):
        diff = total_commit - float(available_capacity_kg)
        explanations.append(f"B2B commitments ({total_commit}kg) exceed available capacity ({available_capacity_kg}kg), so at least {round(diff,2)}kg of commitment shortfall is unavoidable.")
    
    shortfall_amt = sum(sf['shortfall_kg'] for sf in commitment_shortfalls)
    if shortfall_amt > 0 and len(explanations) == 0:
        explanations.append(f"Capacity constraint caused an unavoidable shortfall of {round(shortfall_amt,2)}kg for B2B.")
        
    if strategy == "balanced" and available_capacity_kg < (d2c_req + b2b_req):
        explanations.append("Balanced strategy weighted economic return against strategic priority constraints to distribute limited capacity.")
    elif strategy == "revenue" and available_capacity_kg < (d2c_req + b2b_req):
        explanations.append("High-margin segments were prioritized strictly based on contribution margin per kg.")
    elif strategy == "fulfillment" and available_capacity_kg < (d2c_req + b2b_req):
        explanations.append("Highly prioritized B2B accounts were heavily weighted over aggregate volumes.")
        
    for r in results:
        if r['allocated_kg'] > 0 and r['unfulfilled_kg'] > 0:
            explanations.append(f"Segment {r['segment_id']} ({r['region']} {r['channel']}) received partial capacity due to constraint limits.")

    explanations = list(dict.fromkeys(explanations))[:5]

    return {
        "strategy": strategy,
        "available_capacity_kg": round(float(available_capacity_kg), 2),
        "segments": results,
        "total_allocated_kg": round(total_allocated, 2),
        "unfulfilled_demand_kg": round(total_unfulfilled, 2),
        "expected_revenue_inr": round(expected_revenue, 2),
        "expected_contribution_margin_inr": round(expected_margin, 2),
        "overall_fulfillment_pct": round(overall_fulfillment, 2),
        "b2b_fulfillment_pct": round(b2b_fulfillment, 2),
        "d2c_fulfillment_pct": round(d2c_fulfillment, 2),
        "capacity_utilization_pct": round(utilization_pct, 2),
        "commitment_shortfalls": commitment_shortfalls,
        "binding_constraints": binding_constraints,
        "strategy_explanation": {
            "summary": strat_summary,
            "tradeoffs": tradeoffs
        },
        "explanations": explanations
    }

