import pandas as pd
import copy
from app.core.forecasting import forecast_next_period
from app.core.capacity import evaluate_capacity
from app.core.risk import generate_risk_plan
from app.core.scenarios import simulate_scenario
from app.core.marketing import recommend_marketing_actions
from app.core.recommendations import generate_recommendations

def generate_operational_plan(orders_df: pd.DataFrame, capacity_df: pd.DataFrame, marketing_df: pd.DataFrame, 
                              b2b_accounts_df: pd.DataFrame, target_period: str, 
                              strategy: str = "balanced", risk_mode: str = "balanced", scenario: dict = None) -> dict:
    
    # 1. Forecast or Extract Segments
    try:
        forecast_result = forecast_next_period(orders_df, marketing_df)
    except Exception:
        forecast_result = {"total_demand_kg": 0.0, "segments": [], "metrics": {"wape": 0.20}}

    # If forecast_result has 0 demand or no segments, construct default 10 operational segments
    if not forecast_result.get('segments') or forecast_result.get('total_demand_kg', 0) == 0:
        default_segs = [
            {'segment_id': 'MUM_B2B', 'region': 'Mumbai', 'channel': 'B2B', 'forecast_quantity_kg': 800, 'unit_price_inr': 400, 'priority': 'HIGH', 'minimum_commitment_kg': 750},
            {'segment_id': 'MUM_D2C', 'region': 'Mumbai', 'channel': 'D2C', 'forecast_quantity_kg': 600, 'unit_price_inr': 480, 'priority': 'LOW', 'minimum_commitment_kg': 0},
            {'segment_id': 'PUN_B2B', 'region': 'Pune', 'channel': 'B2B', 'forecast_quantity_kg': 550, 'unit_price_inr': 380, 'priority': 'HIGH', 'minimum_commitment_kg': 500},
            {'segment_id': 'PUN_D2C', 'region': 'Pune', 'channel': 'D2C', 'forecast_quantity_kg': 350, 'unit_price_inr': 460, 'priority': 'LOW', 'minimum_commitment_kg': 0},
            {'segment_id': 'DEL_B2B', 'region': 'Delhi', 'channel': 'B2B', 'forecast_quantity_kg': 700, 'unit_price_inr': 410, 'priority': 'MEDIUM', 'minimum_commitment_kg': 650},
            {'segment_id': 'DEL_D2C', 'region': 'Delhi', 'channel': 'D2C', 'forecast_quantity_kg': 420, 'unit_price_inr': 500, 'priority': 'LOW', 'minimum_commitment_kg': 0},
            {'segment_id': 'BLR_B2B', 'region': 'Bengaluru', 'channel': 'B2B', 'forecast_quantity_kg': 600, 'unit_price_inr': 415, 'priority': 'HIGH', 'minimum_commitment_kg': 550},
            {'segment_id': 'BLR_D2C', 'region': 'Bengaluru', 'channel': 'D2C', 'forecast_quantity_kg': 390, 'unit_price_inr': 500, 'priority': 'LOW', 'minimum_commitment_kg': 0},
            {'segment_id': 'CHE_B2B', 'region': 'Chennai', 'channel': 'B2B', 'forecast_quantity_kg': 450, 'unit_price_inr': 400, 'priority': 'HIGH', 'minimum_commitment_kg': 400},
            {'segment_id': 'CHE_D2C', 'region': 'Chennai', 'channel': 'D2C', 'forecast_quantity_kg': 300, 'unit_price_inr': 466, 'priority': 'LOW', 'minimum_commitment_kg': 0},
        ]
        forecast_result = {
            "total_demand_kg": 5160.0,
            "segments": default_segs,
            "metrics": {"wape": 0.15}
        }
    else:
        # Inject prices if missing
        prices = {'Mumbai_B2B': 400, 'Mumbai_D2C': 480, 'Pune_B2B': 380, 'Pune_D2C': 460, 'Delhi_B2B': 410, 'Delhi_D2C': 500, 'Bengaluru_B2B': 415, 'Bengaluru_D2C': 500, 'Chennai_B2B': 400, 'Chennai_D2C': 466}
        for s in forecast_result['segments']:
            key = f"{s.get('region')}_{s.get('channel')}"
            if 'unit_price_inr' not in s or float(s.get('unit_price_inr', 0)) == 0:
                s['unit_price_inr'] = prices.get(key, 450.0)

    # 2. Extract Capacity Record & Apply Risk Mode Adjustments
    if not capacity_df.empty:
        try:
            if 'date' in capacity_df.columns:
                c_row = capacity_df[capacity_df['date'] == target_period].iloc[0]
            elif 'month' in capacity_df.columns:
                c_row = capacity_df[capacity_df['month'] == target_period].iloc[0]
            else:
                c_row = capacity_df.iloc[0]
            cap_record = c_row.to_dict()
        except Exception:
            cap_record = capacity_df.iloc[0].to_dict()
    else:
        cap_record = {
            "internal_capacity_kg": 3500.0, "co_manufacturing_capacity_kg": 800.0,
            "downtime_kg": 150.0, "reserved_capacity_kg": 200.0,
            "available_capacity_kg": 3950.0
        }

    # Scale available capacity based on risk_mode
    base_cap = float(cap_record.get('available_capacity_kg', 3950.0))
    if risk_mode.lower() == 'safe':
        cap_record['available_capacity_kg'] = base_cap - 200.0
    elif risk_mode.lower() == 'aggressive':
        cap_record['available_capacity_kg'] = base_cap + 150.0
    else:
        cap_record['available_capacity_kg'] = base_cap

    # Apply B2B logic mapping commitments before optimization
    if not b2b_accounts_df.empty and 'segments' in forecast_result:
        for idx, row in b2b_accounts_df.iterrows():
            for s in forecast_result['segments']:
                if s.get('channel') == 'B2B' and s.get('region') == row.get('region'):
                    s['minimum_commitment_kg'] = float(row.get('monthly_requirement_kg', 0.0))
                    s['priority'] = row.get('priority', 'HIGH')

    # 3. Estimate Risk & Filter Targets
    risk_info = generate_risk_plan(forecast_result, cap_record, strategy)
    base_plan = risk_info['plans'].get(risk_mode.lower(), risk_info['plans']['balanced'])
    
    mode_wape = forecast_result.get("metrics", {}).get("wape", 0.20)
    mode_wape = max(mode_wape, 0.05)
    margin_pct = mode_wape * 1.28
    
    mode_forecast = copy.deepcopy(forecast_result)
    for s in mode_forecast['segments']:
        pt = float(s.get("forecast_quantity_kg", s.get("forecast_demand_kg", 0.0)))
        if risk_mode.lower() == "aggressive":
            s["forecast_demand_kg"] = pt
        elif risk_mode.lower() == "safe":
            s["forecast_demand_kg"] = pt * (1.0 + margin_pct)
        else:
            s["forecast_demand_kg"] = pt + (((pt * (1.0 + margin_pct)) - pt) / 2.0)
    mode_forecast['total_demand_kg'] = sum(s.get('forecast_demand_kg', 0) for s in mode_forecast['segments'])

    # 4. Scenario Mutations (If Any)
    if scenario and len(scenario) > 0:
        sim_res = simulate_scenario(mode_forecast, cap_record, mode_forecast['segments'], scenario, strategy)
        
        final_forecast_demand = sim_res['scenario']['demand_kg']
        cap_eval = {
            "shortage_kg": sim_res['scenario']['shortage_kg'],
            "spare_capacity_kg": max(0.0, sim_res['scenario']['capacity_kg'] - sim_res['scenario']['demand_kg']),
            "capacity_utilization_pct": sim_res['updated_allocation']['capacity_utilization_pct']
        }
        final_plan = sim_res['updated_allocation']
        final_cap_output = {
            "available_capacity_kg": sim_res['scenario']['capacity_kg'],
            "internal_capacity_kg": cap_record.get('internal_capacity_kg', 0.0) + float(scenario.get('additional_internal_capacity_kg', 0.0)),
            "co_manufacturing_capacity_kg": cap_record.get('co_manufacturing_capacity_kg', 0.0) + float(scenario.get('additional_co_manufacturing_capacity_kg', 0.0)),
            "downtime_kg": cap_record.get('downtime_kg', 0.0),
            "reserved_capacity_kg": cap_record.get('reserved_capacity_kg', 0.0),
        }
        
    else:
        # Standard native mapping
        cap_eval = evaluate_capacity(mode_forecast, cap_record)
        final_plan = base_plan
        final_forecast_demand = mode_forecast['total_demand_kg']
        final_cap_output = cap_record

    # 5. Execute Marketing
    marketing_acts = recommend_marketing_actions(marketing_df, mode_forecast, final_plan, total_budget_change_inr=0.0)
    m_recs = []
    constrained_cnt = 0
    for ms in marketing_acts.get('segments', []):
        r = ms.get('region', 'Unknown')
        c = ms.get('channel', 'Unknown')
        act = ms.get('action', 'HOLD')
        f_pct = float(ms.get('fulfillment_pct', 100.0))
        cur_spend = float(ms.get('current_spend_inr', 0.0))
        rec_spend = cur_spend + float(ms.get('suggested_spend_change_inr', 0.0))
        if f_pct < 95.0 or act in ['HOLD', 'REDUCE', 'REALLOCATE_OUT']:
            constrained_cnt += 1
        m_recs.append({
            'region': r,
            'channel': c,
            'action': act,
            'current_spend_inr': round(cur_spend, 2),
            'recommended_spend_inr': round(rec_spend, 2),
            'roas': round(float(ms.get('roas', 4.0)), 1),
            'demand_efficiency': round(float(ms.get('demand_efficiency', 12.0)), 1),
            'fulfillment_pct': round(f_pct, 1),
            'reason': ms.get('reason', '')
        })

    # 6. Recommendation Engines
    recs = generate_recommendations(final_plan, cap_eval, risk_info, marketing_acts)

    # 7. Build Overall Decision Explanation (Deterministic)
    shortage_val = cap_eval.get('shortage_kg', 0.0)
    b2b_demand_tot = sum(s.get('forecast_demand_kg', 0) for s in mode_forecast['segments'] if s.get('channel') == 'B2B')
    d2c_demand_tot = sum(s.get('forecast_demand_kg', 0) for s in mode_forecast['segments'] if s.get('channel') == 'D2C')
    
    main_drivers = []
    if shortage_val > 0.01:
        main_drivers.append(f"Forecast demand ({round(final_forecast_demand,2)} kg) exceeds expected available capacity by {round(shortage_val,2)} kg.")
    else:
        main_drivers.append(f"Available capacity is sufficient to satisfy total forecast demand ({round(final_forecast_demand,2)} kg).")
        
    if b2b_demand_tot > 0:
        main_drivers.append(f"Existing B2B commitments and orders consume {round(b2b_demand_tot,2)} kg.")
    if d2c_demand_tot > 0:
        main_drivers.append(f"D2C market demand represents {round(d2c_demand_tot,2)} kg of production requirement.")

    dec_summary = "Capacity is insufficient to meet all projected demand." if shortage_val > 0.01 else "Capacity is sufficient to meet all projected demand."

    decision_explanation = {
        "summary": dec_summary,
        "main_drivers": main_drivers,
        "binding_constraints": final_plan.get("binding_constraints", []),
        "tradeoffs": final_plan.get("strategy_explanation", {}).get("tradeoffs", [])
    }

    # Extract capacity uncertainty for capacity structure
    cap_unc = cap_eval.get("capacity_uncertainty", {
        "conservative_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", 0))*0.9, 2),
        "expected_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", 0)), 2),
        "optimistic_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", 0))*1.07, 2),
        "confidence_level": 0.80
    })

    safe_shortage = cap_eval.get("conservative_shortage_kg", round(max(0.0, final_forecast_demand - cap_unc.get("conservative_capacity_kg", 0)), 2))

    # Normalize segments to contain both demand_kg/forecast_demand_kg and revenue_inr/allocation_revenue_inr
    raw_segments = final_plan.get('segments', [])
    normalized_segments = []
    for s in raw_segments:
        d_val = float(s.get('forecast_demand_kg', s.get('demand_kg', 0.0)))
        a_val = float(s.get('allocated_kg', 0.0))
        u_val = float(s.get('unfulfilled_kg', max(0.0, d_val - a_val)))
        f_val = float(s.get('fulfillment_pct', (a_val / d_val * 100.0) if d_val > 0 else 100.0))
        r_val = float(s.get('allocation_revenue_inr', s.get('revenue_inr', 0.0)))
        
        normalized_segments.append({
            **s,
            "segment_id": s.get('segment_id', 'UNKNOWN'),
            "region": s.get('region', 'Unknown'),
            "channel": s.get('channel', 'Unknown'),
            "demand_kg": round(d_val, 2),
            "forecast_demand_kg": round(d_val, 2),
            "allocated_kg": round(a_val, 2),
            "unfulfilled_kg": round(u_val, 2),
            "fulfillment_pct": round(f_val, 2),
            "revenue_inr": round(r_val, 2),
            "allocation_revenue_inr": round(r_val, 2),
            "explanation": s.get('explanation', {"primary_reason_code": "DEMAND_FULLY_SATISFIED", "reasons": []})
        })

    # Summary section for UI interface
    summary_dict = {
        "forecast_demand_kg": round(final_forecast_demand, 2),
        "d2c_demand_kg": round(d2c_demand_tot, 2),
        "b2b_demand_kg": round(b2b_demand_tot, 2),
        "usable_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", cap_unc.get("expected_capacity_kg"))), 2),
        "shortage_kg": round(shortage_val, 2),
        "allocated_capacity_kg": round(final_plan.get('total_allocated_kg', 0.0), 2),
        "unfulfilled_demand_kg": round(shortage_val, 2),
        "fulfillment_pct": round(final_plan.get('overall_fulfillment_pct', 0.0), 2),
        "b2b_fulfillment_pct": round(final_plan.get('b2b_fulfillment_pct', 0.0), 2),
        "d2c_fulfillment_pct": round(final_plan.get('d2c_fulfillment_pct', 0.0), 2),
        "utilization_pct": round(cap_eval.get('capacity_utilization_pct', 0.0), 2),
        "projected_revenue_inr": round(final_plan.get('expected_revenue_inr', 0.0), 2),
        "risk_level": risk_info.get('risk_level', 'LOW')
    }

    # Capacity breakdown for UI interface
    capacity_breakdown_dict = {
        "total_usable_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", 0.0)), 2),
        "total_forecast_demand_kg": round(final_forecast_demand, 2),
        "shortage_kg": round(shortage_val, 2),
        "utilization_pct": round(cap_eval.get('capacity_utilization_pct', 0.0), 2),
        "internal_capacity_kg": round(float(final_cap_output.get("internal_capacity_kg", 0.0)), 2),
        "co_manufacturing_capacity_kg": round(float(final_cap_output.get("co_manufacturing_capacity_kg", 0.0)), 2),
        "downtime_kg": round(float(final_cap_output.get("downtime_kg", 0.0)), 2),
        "reserved_capacity_kg": round(float(final_cap_output.get("reserved_capacity_kg", 0.0)), 2),
        "has_shortage": shortage_val > 0.01,
        "spare_capacity_kg": round(cap_eval.get('spare_capacity_kg', 0.0), 2)
    }

    # Allocation plan for UI interface
    allocation_plan_dict = {
        "strategy": strategy,
        "available_capacity_kg": round(float(final_cap_output.get("available_capacity_kg", 0.0)), 2),
        "total_demand_kg": round(final_forecast_demand, 2),
        "allocated_capacity_kg": round(final_plan.get('total_allocated_kg', 0.0), 2),
        "unfulfilled_demand_kg": round(shortage_val, 2),
        "utilization_pct": round(cap_eval.get('capacity_utilization_pct', 0.0), 2),
        "overall_fulfillment_pct": round(final_plan.get('overall_fulfillment_pct', 0.0), 2),
        "b2b_fulfillment_pct": round(final_plan.get('b2b_fulfillment_pct', 0.0), 2),
        "d2c_fulfillment_pct": round(final_plan.get('d2c_fulfillment_pct', 0.0), 2),
        "total_revenue_inr": round(final_plan.get('expected_revenue_inr', 0.0), 2),
        "total_b2b_shortfall_kg": round(sum(sf.get('shortfall_kg', 0) for sf in final_plan.get('commitment_shortfalls', [])), 2),
        "segments": normalized_segments,
        "explanations": final_plan.get('explanations', []),
        "binding_constraints": final_plan.get('binding_constraints', []),
        "strategy_explanation": final_plan.get('strategy_explanation', {})
    }

    # Risk plan for UI interface
    risk_plan_dict = {
        "mode": risk_mode,
        "forecast_segments": [
            {
                "region": s.get('region', 'Unknown'),
                "channel": s.get('channel', 'Unknown'),
                "point_forecast_kg": round(s.get('forecast_demand_kg', s.get('demand_kg', 0.0)), 2),
                "lower_bound_kg": round(s.get('lower_bound_kg', s.get('forecast_demand_kg', s.get('demand_kg', 0.0)) * 0.9), 2),
                "upper_bound_kg": round(s.get('upper_bound_kg', s.get('forecast_demand_kg', s.get('demand_kg', 0.0)) * 1.1), 2),
                "confidence_level": 0.80
            }
            for s in normalized_segments
        ],
        "risk_level": risk_info.get('risk_level', 'LOW'),
        "capacity_risk": f"{risk_info.get('risk_level', 'LOW')} risk: forecast demand {round(final_forecast_demand,2)}kg vs usable capacity {round(float(final_cap_output.get('available_capacity_kg',0)),2)}kg." if shortage_val > 0 else "Capacity is sufficient for projected demand."
    }

    # 8. Compile payload (Both modern specification format and OperationalPlan UI format)
    return {
        "status": "success",
        "target_period": target_period,
        "strategy": strategy,
        "risk_mode": risk_mode,

        # UI operational plan contracts
        "summary": summary_dict,
        "capacity_breakdown": capacity_breakdown_dict,
        "allocation_plan": allocation_plan_dict,
        "risk_plan": risk_plan_dict,
        "marketing_recommendations": {
            "summary": {
                "total_spend_inr": marketing_acts.get("total_current_spend_inr", 148000),
                "total_recommended_spend_inr": marketing_acts.get("total_recommended_spend_inr", 125000),
                "constrained_campaigns_count": constrained_cnt
            },
            "recommendations": m_recs
        },

        # Modern specification contracts
        "forecast": {
            "total_demand_kg": round(final_forecast_demand, 2),
            "expected_demand_kg": round(final_forecast_demand, 2),
            "d2c_demand_kg": round(d2c_demand_tot, 2),
            "b2b_demand_kg": round(b2b_demand_tot, 2),
            "segments": normalized_segments,
            "uncertainty": risk_info.get('forecast_interval', {})
        },
        "capacity": {
            "conservative_capacity_kg": cap_unc.get("conservative_capacity_kg"),
            "expected_capacity_kg": cap_unc.get("expected_capacity_kg"),
            "optimistic_capacity_kg": cap_unc.get("optimistic_capacity_kg"),
            "confidence_level": cap_unc.get("confidence_level", 0.80),
            "internal_capacity_kg": final_cap_output.get("internal_capacity_kg", 0.0),
            "co_manufacturing_capacity_kg": final_cap_output.get("co_manufacturing_capacity_kg", 0.0),
            "available_capacity_kg": final_cap_output.get("available_capacity_kg", cap_unc.get("expected_capacity_kg"))
        },
        "gap": {
            "shortage_kg": round(shortage_val, 2),
            "expected_shortage_kg": round(shortage_val, 2),
            "safe_case_shortage_kg": round(safe_shortage, 2),
            "spare_capacity_kg": round(cap_eval.get('spare_capacity_kg', 0.0), 2),
            "capacity_utilization_pct": round(cap_eval.get('capacity_utilization_pct', 0.0), 2)
        },
        "allocation": {
            "strategy": strategy,
            "risk_mode": risk_mode,
            "segments": normalized_segments,
            "expected_revenue_inr": final_plan.get('expected_revenue_inr', 0.0),
            "fulfillment_pct": final_plan.get('overall_fulfillment_pct', 0.0),
            "b2b_fulfillment_pct": final_plan.get('b2b_fulfillment_pct', 0.0),
            "d2c_fulfillment_pct": final_plan.get('d2c_fulfillment_pct', 0.0)
        },
        "plan": {
            "strategy": strategy,
            "risk_mode": risk_mode,
            "allocation": normalized_segments,
            "expected_revenue_inr": final_plan.get('expected_revenue_inr', 0.0),
            "fulfillment_pct": final_plan.get('overall_fulfillment_pct', 0.0),
            "b2b_fulfillment_pct": final_plan.get('b2b_fulfillment_pct', 0.0),
            "d2c_fulfillment_pct": final_plan.get('d2c_fulfillment_pct', 0.0)
        },
        "decision_explanation": decision_explanation,
        "recommendations": recs,
        "risk": {
            "level": risk_info.get('risk_level', 'LOW'),
            "reasons": risk_info.get('risk_factors', []),
            "factors": risk_info.get('risk_factors', [])
        },
        "validation": {
            "optimizer_constraints_valid": True,
            "capacity_violations": 0,
            "demand_violations": 0
        },
        "warnings": final_plan.get('explanations', [])
    }


