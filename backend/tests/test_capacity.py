import pytest
from app.core.capacity import evaluate_capacity

def test_demand_less_than_capacity():
    res = evaluate_capacity(
        {"total_demand_kg": 80.0},
        {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 0, "downtime_kg": 10, "reserved_capacity_kg": 0}
    )
    assert res['available_capacity_kg'] == 90.0
    assert res['status'] == 'SPARE_CAPACITY'
    assert res['spare_capacity_kg'] == 10.0
    assert res['shortage_kg'] == 0.0
    assert res['capacity_utilization_pct'] == round((80/90)*100, 2)
    assert len(res['warnings']) == 0

def test_demand_equals_capacity():
    res = evaluate_capacity(
        {"total_demand_kg": 90.0},
        {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 0, "downtime_kg": 10, "reserved_capacity_kg": 0}
    )
    assert res['available_capacity_kg'] == 90.0
    assert res['status'] == 'BALANCED'
    assert res['shortage_kg'] == 0.0
    assert res['spare_capacity_kg'] == 0.0
    assert res['capacity_utilization_pct'] == 100.0

def test_demand_greater_than_capacity():
    res = evaluate_capacity(
        {"total_demand_kg": 120.0},
        {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 0, "downtime_kg": 0, "reserved_capacity_kg": 10}
    )
    assert res['available_capacity_kg'] == 90.0
    assert res['status'] == 'SHORTAGE'
    assert res['shortage_kg'] == 30.0
    assert res['spare_capacity_kg'] == 0.0
    assert res['capacity_gap_kg'] == -30.0

def test_zero_capacity():
    res = evaluate_capacity(
        {"total_demand_kg": 50.0},
        {"internal_capacity_kg": 0.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    )
    assert res['available_capacity_kg'] == 0.0
    assert res['status'] == 'SHORTAGE'
    assert res['capacity_utilization_pct'] == 0.0
    assert any("zero" in w.lower() for w in res['warnings'])

def test_co_manufacturing_capacity():
    res = evaluate_capacity(
        {"total_demand_kg": 140.0},
        {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 50.0, "downtime_kg": 0.0, "reserved_capacity_kg": 5.0}
    )
    assert res['available_capacity_kg'] == 145.0
    assert res['status'] == 'SPARE_CAPACITY'
    assert res['spare_capacity_kg'] == 5.0

def test_downtime_greater_than_internal():
    # If downtime + reserved > capacity, available drops below 0 and clamps to 0
    res = evaluate_capacity(
        {"total_demand_kg": 10.0},
        {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 110.0, "reserved_capacity_kg": 0.0}
    )
    assert res['available_capacity_kg'] == 0.0
    assert res['status'] == 'SHORTAGE'
    assert res['shortage_kg'] == 10.0
    assert any("clamped" in w.lower() for w in res['warnings'])

def test_invalid_negative_inputs():
    with pytest.raises(ValueError, match="negative capacity"):
        evaluate_capacity(
            {"total_demand_kg": 50.0}, 
            {"internal_capacity_kg": -10.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
        )
    
    with pytest.raises(ValueError, match="negative forecast"):
        evaluate_capacity(
            {"total_demand_kg": -20.0}, 
            {"internal_capacity_kg": 100.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
        )
