import pandas as pd
from app.core.marketing import recommend_marketing_actions

def test_marketing_allocations():
    # Setup dummy data
    mkt_df = pd.DataFrame({
        'region': ['Mumbai', 'Pune', 'Goa'],
        'channel': ['D2C', 'D2C', 'D2C'],
        'marketing_spend_inr': [10000.0, 5000.0, 0.0],
        'attributed_quantity_kg': [100.0, 50.0, 0.0],
        'attributed_revenue_inr': [50000.0, 20000.0, 0.0]
    })
    
    # Capacity constrained Mumbai (90%), Pune is free (100%), Goa is free (100%) but has 0 budget/roas.
    alloc_result = {
        "segments": [
            {"region": "Mumbai", "channel": "D2C", "fulfillment_pct": 80.0},
            {"region": "Pune", "channel": "D2C", "fulfillment_pct": 100.0}
        ]
    }
    
    # 1. Zero-Sum Reallocation Check
    res = recommend_marketing_actions(mkt_df, {}, alloc_result, total_budget_change_inr=0.0)
    
    # Mumbai was constrained, its action should be REALLOCATE_OUT
    mumbai = next(s for s in res['segments'] if s['region'] == 'Mumbai')
    assert mumbai['action'] == 'REALLOCATE_OUT'
    assert mumbai['suggested_spend_change_inr'] < 0.0
    
    # Pune was 100% capacity and good ROI, its action should be REALLOCATE_IN
    pune = next(s for s in res['segments'] if s['region'] == 'Pune')
    assert pune['action'] == 'REALLOCATE_IN'
    assert pune['suggested_spend_change_inr'] > 0.0
    
    # The sum of changes should be exactly 0 (Zero-sum constraint)
    net_change = round(mumbai['suggested_spend_change_inr'] + pune['suggested_spend_change_inr'], 2)
    assert net_change == 0.0
    assert res['total_recommended_spend_inr'] == 15000.0

def test_marketing_allocations_with_new_budget():
    mkt_df = pd.DataFrame({
        'region': ['Mumbai'],
        'channel': ['D2C'],
        'marketing_spend_inr': [5000.0],
        'attributed_quantity_kg': [50.0],
        'attributed_revenue_inr': [10000.0] # ROAS 2.0
    })
    alloc_result = {
        "segments": [
            {"region": "Mumbai", "channel": "D2C", "fulfillment_pct": 100.0}
        ]
    }
    
    res = recommend_marketing_actions(mkt_df, {}, alloc_result, total_budget_change_inr=2000.0)
    assert res['total_current_spend_inr'] == 5000.0
    assert res['total_recommended_spend_inr'] == 7000.0
    mumbai = next(s for s in res['segments'] if s['region'] == 'Mumbai')
    assert mumbai['action'] == 'INCREASE'
    assert mumbai['suggested_spend_change_inr'] == 2000.0
