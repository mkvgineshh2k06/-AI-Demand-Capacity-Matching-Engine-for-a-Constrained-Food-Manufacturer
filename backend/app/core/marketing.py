import pandas as pd
import numpy as np

def recommend_marketing_actions(marketing_df: pd.DataFrame, forecast_result: dict, allocation_result: dict, total_budget_change_inr: float = 0.0) -> dict:
    
    # 1. Aggregate Historical Marketing Data per Segment
    segment_metrics = {}
    total_current_spend = 0.0
    
    if not marketing_df.empty:
        # Assuming we just want to look at the total metrics across the dataset to evaluate efficiency
        # In a real app we might heavily weigh recent weeks.
        agg = marketing_df.groupby(['region', 'channel']).agg({
            'marketing_spend_inr': 'sum',
            'attributed_quantity_kg': 'sum',
            'attributed_revenue_inr': 'sum'
        }).reset_index()
        
        for _, row in agg.iterrows():
            k = (row['region'], row['channel'])
            spend = float(row['marketing_spend_inr'])
            qty = float(row['attributed_quantity_kg'])
            rev = float(row['attributed_revenue_inr'])
            
            # Simple conversion to a weekly or monthly budget is fine, but for allocation
            # we'll just consider the aggregated 'current_spend' as the baseline budget proxy.
            segment_metrics[k] = {
                'current_spend_inr': round(spend, 2),
                'roas': round(rev / spend, 2) if spend > 0 else 0.0,
                'demand_efficiency': round(qty / spend, 4) if spend > 0 else 0.0
            }
            total_current_spend += spend
    
    # 2. Map Optimizer constraints and classify actions
    segments = []
    
    # Trackers for reallocation mechanics
    donors = []
    receivers = []
    donor_pool = 0.0
    
    roas_vals = [m['roas'] for m in segment_metrics.values()]
    median_roas = np.median(roas_vals) if roas_vals else 0.0
    
    for alloc_seg in allocation_result.get('segments', []):
        r = alloc_seg.get('region')
        c = alloc_seg.get('channel')
        f_pct = float(alloc_seg.get('fulfillment_pct', 100.0))
        
        k = (r, c)
        mets = segment_metrics.get(k, {'current_spend_inr': 0.0, 'roas': 0.0, 'demand_efficiency': 0.0})
        spend_baseline = mets['current_spend_inr']
        
        seg_data = {
            "region": r,
            "channel": c,
            "current_spend_inr": spend_baseline,
            "roas": mets['roas'],
            "demand_efficiency": mets['demand_efficiency'],
            "fulfillment_pct": f_pct,
            "action": "HOLD",
            "suggested_spend_change_inr": 0.0,
            "reason": ""
        }
        
        # Classification
        if f_pct < 98.0:
            # Capacity choked. Must not accelerate. 
            if spend_baseline > 0:
                reduction = spend_baseline * 0.20 # 20% budget cut
                donor_pool += reduction
                seg_data['suggested_spend_change_inr'] = -reduction
                seg_data['action'] = 'REALLOCATE_OUT' if total_budget_change_inr == 0 else 'REDUCE'
                seg_data['reason'] = f"Fulfillment constrained at {f_pct}%. Reducing demand-gen spend until capacity expands."
                donors.append(seg_data)
            else:
                seg_data['action'] = 'HOLD'
                seg_data['reason'] = "Fulfillment is constrained, but spend is already zero. Holding."
                
        else:
            # Spare capacity exists. Eligible for growth if efficiency is acceptable.
            # Assuming ROAS > 1.0 or better than median is acceptable
            if mets['roas'] > 1.0 or mets['roas'] >= median_roas:
                receivers.append(seg_data)
                seg_data['action'] = 'REALLOCATE_IN' if total_budget_change_inr == 0 else 'INCREASE'
                seg_data['reason'] = "High ROAS and healthy fulfillment. Targeting for budget expansion."
            else:
                if spend_baseline > 0:
                    reduction = spend_baseline * 0.10 # 10% budget cut for poor performance
                    donor_pool += reduction
                    seg_data['suggested_spend_change_inr'] = -reduction
                    seg_data['action'] = 'REALLOCATE_OUT' if total_budget_change_inr == 0 else 'REDUCE'
                    seg_data['reason'] = f"Fulfillment is healthy, but ROAS ({mets['roas']}) is low. Trimming budget."
                    donors.append(seg_data)
                else:
                    seg_data['action'] = 'HOLD'
                    seg_data['reason'] = "Healthy fulfillment but poor historical return and zero spend. Holding."
                    
        segments.append(seg_data)
        
    # 3. Distribute budget pool to receivers
    total_pool_to_distribute = donor_pool + total_budget_change_inr
    
    if total_pool_to_distribute > 0 and receivers:
        # Sum weights to distribute proportionally. 
        # Base weight on (Current Spend + 1000) * ROAS to favor scaling successful running campaigns.
        sum_weights = sum((rcv['current_spend_inr'] + 1000.0) * max(1.0, rcv['roas']) for rcv in receivers)
        
        for rcv in receivers:
            weight = (rcv['current_spend_inr'] + 1000.0) * max(1.0, rcv['roas'])
            share = (weight / sum_weights) * total_pool_to_distribute
            rcv['suggested_spend_change_inr'] += share
            
    elif total_pool_to_distribute > 0 and not receivers:
        # Nowhere to put the money! Just pocket the savings, overriding initial zero-sum assumptions for safety.
        # Ensure we just mention there are no eligible receivers.
        pass
        
    # Rounding and mapping final totals
    total_suggested_spend = 0.0
    for s in segments:
        s['suggested_spend_change_inr'] = round(s['suggested_spend_change_inr'], 2)
        total_suggested_spend += s['current_spend_inr'] + s['suggested_spend_change_inr']
        
    # Guard against float drift making zero-sum slightly off
    if total_budget_change_inr == 0.0 and abs(total_suggested_spend - total_current_spend) < 1.0:
        total_suggested_spend = total_current_spend
        
    return {
        "segments": segments,
        "total_current_spend_inr": round(total_current_spend, 2),
        "total_recommended_spend_inr": round(total_suggested_spend, 2)
    }
