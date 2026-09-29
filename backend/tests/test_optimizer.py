import pytest
from app.core.optimizer import allocate_capacity

def get_demo_segments():
    return [
        {
            "segment_id": "seg_1", "region": "Mumbai", "channel": "B2B",
            "forecast_demand_kg": 100, "unit_price_inr": 250, "variable_cost_inr": 150,
            "priority": "HIGH", "minimum_commitment_kg": 50
        },
        {
            "segment_id": "seg_2", "region": "Pune", "channel": "D2C",
            "forecast_demand_kg": 80, "unit_price_inr": 400, "variable_cost_inr": 100,
            "priority": "LOW", "minimum_commitment_kg": 0
        },
        {
            "segment_id": "seg_3", "region": "Goa", "channel": "B2B",
            "forecast_demand_kg": 50, "unit_price_inr": 300, "variable_cost_inr": 200,
            "priority": "LOW", "minimum_commitment_kg": 20
        }
    ]

def test_optimizer_enough_capacity():
    segs = get_demo_segments()
    res = allocate_capacity("balanced", 300, segs) # demand is 230
    assert res['total_allocated_kg'] == 230
    assert res['unfulfilled_demand_kg'] == 0
    assert len(res['commitment_shortfalls']) == 0
    assert res['overall_fulfillment_pct'] == 100.0

def test_optimizer_revenue_strategy_limited_capacity():
    segs = get_demo_segments()
    # D2C (seg_2) has margin 300 (400-100).
    # B2B (seg_1) margin 100.
    # B2B (seg_3) margin 100. 
    # With 100 cap and revenue strategy, it should prioritize segments based on profitability
    # but still bounded by minimum commitments because shortfalls are penalized. 
    # Let's ensure shortfall penalty is strictly respected.
    res = allocate_capacity("revenue", 120, segs)
    allocs = {s['segment_id']: s['allocated_kg'] for s in res['segments']}
    # Min commitments: seg_1 requires 50, seg_3 requires 20 = 70 needed.
    # Capacity is 120 -> 50 left.
    # Seg 2 margin is highest, so seg_2 should get the remaining 50.
    assert allocs["seg_2"] == 50
    assert allocs["seg_1"] == 50
    assert allocs["seg_3"] == 20
    assert res['total_allocated_kg'] == 120

def test_optimizer_commitments_exceed_capacity():
    segs = get_demo_segments()
    # Commitments = 70. Capacity = 30.
    res = allocate_capacity("balanced", 30, segs)
    assert res['total_allocated_kg'] == 30.0
    # We must have shortfalls!
    assert len(res['commitment_shortfalls']) > 0
    # Assert explanation explicitly mentioned commitments exceeding capacity
    assert any("exceed available capacity" in expl for expl in res['explanations'])

def test_no_negative_allocation():
    segs = get_demo_segments()
    res = allocate_capacity("fulfillment", 50, segs)
    for s in res['segments']:
        assert s['allocated_kg'] >= 0

def test_zero_capacity():
    segs = get_demo_segments()
    res = allocate_capacity("balanced", 0, segs)
    assert res['total_allocated_kg'] == 0.0
    for s in res['segments']:
        assert s['allocated_kg'] == 0.0

def test_allocation_never_exceeds_demand():
    segs = get_demo_segments()
    res = allocate_capacity("revenue", 500, segs)
    allocs = {s['segment_id']: s['allocated_kg'] for s in res['segments']}
    assert allocs["seg_1"] <= 100
    assert allocs["seg_2"] <= 80
    assert allocs["seg_3"] <= 50
