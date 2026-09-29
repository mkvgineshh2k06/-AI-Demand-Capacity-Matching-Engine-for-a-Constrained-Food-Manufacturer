import pytest
from app.core.b2b import evaluate_new_b2b_account

def get_demo_segments():
    return [
        {
            "segment_id": "seg_1", "region": "Mumbai", "channel": "B2B",
            "forecast_demand_kg": 100, "unit_price_inr": 250,
            "minimum_commitment_kg": 100, "priority": "HIGH"
        },
        {
            "segment_id": "seg_2", "region": "Pune", "channel": "D2C",
            "forecast_demand_kg": 80, "unit_price_inr": 400
        }
    ]

def get_new_account(req_kg=30):
    return {
        "customer_name": "NEW_B2B_CORP",
        "region": "Mumbai",
        "monthly_requirement_kg": req_kg,
        "unit_price_inr": 350,
        "minimum_fulfillment_pct": 100.0,
        "priority": "HIGH"
    }

def test_feasible_immediately():
    # Capacity is 250, demand 180. New demand is 30 -> 210. So it should immediately fit.
    segs = get_demo_segments()
    new_acc = get_new_account(30)
    res = evaluate_new_b2b_account(new_acc, 250, segs)
    
    assert res['feasibility'] == 'FEASIBLE'
    assert res['new_account_fulfillment_pct'] == 100.0
    assert res['minimum_extra_capacity_required_kg'] == 0.0
    assert res['existing_b2b_fulfillment_before'] == 100.0
    assert res['existing_b2b_fulfillment_after'] == 100.0
    assert res['recommendation'] == 'Accept Contract'

def test_conditionally_feasible():
    segs = get_demo_segments()
    # Base B2B=100. D2C=80. Cap=120. (B2B takes 100, D2C takes 20).
    # New B2B wants 50. Total B2B = 150. Cap = 120. Will be forced to fall short.
    # Therefore it should find binary search of 30 extra capacity exactly (100 + 50 = 150 required capacity for protected B2B).
    # D2C is not protected, so D2C will drop to 0, but B2B requires 150 minimum.
    new_acc = get_new_account(50)
    res = evaluate_new_b2b_account(new_acc, 120, segs)
    
    assert res['feasibility'] == 'CONDITIONALLY_FEASIBLE'
    assert res['recommendation'] == 'Negotiate Capacity Addition'
    
    # Extra capacity required should be EXACTLY ~30. (Because base B2B takes 100, new B2B takes 50. Total 150. Cap is 120 -> 30 needed).
    assert abs(res['minimum_extra_capacity_required_kg'] - 30.0) < 0.1

def test_not_feasible_too_large():
    segs = get_demo_segments()
    # Cap 100. New wants 10,000. 
    new_acc = get_new_account(10000)
    res = evaluate_new_b2b_account(new_acc, 100, segs)
    
    assert res['feasibility'] == 'NOT_FEASIBLE'
    assert res['recommendation'] == 'Reject Contract'
