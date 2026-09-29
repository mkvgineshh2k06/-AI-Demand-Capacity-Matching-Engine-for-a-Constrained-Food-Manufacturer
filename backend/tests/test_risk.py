import pytest
from app.core.risk import generate_risk_plan

def get_base_fixtures(forecast=100.0, base_cap=150.0):
    f_res = {
        "metrics": {"wape": 0.20},
        "segments": [
            {
                "segment_id": "seg_1", "region": "Mumbai", "channel": "D2C", 
                "forecast_demand_kg": forecast, "forecast_quantity_kg": forecast, 
                "unit_price_inr": 200.0, "priority": "LOW"
            }
        ]
    }
    c_rec = {
        "internal_capacity_kg": base_cap,
        "co_manufacturing_capacity_kg": 0.0,
        "downtime_kg": 0.0,
        "reserved_capacity_kg": 0.0,
        "available_capacity_kg": base_cap
    }
    return f_res, c_rec

def test_intervals_and_bounds():
    f_res, c_rec = get_base_fixtures(100.0)
    res = generate_risk_plan(f_res, c_rec)
    
    inter = res['forecast_interval']['Mumbai_D2C']
    assert '80%' in inter['confidence_level']
    # 20% wape * 1.28 = 25.6%. Bounds should be 74.4 to 125.6
    assert inter['lower_bound_kg'] == pytest.approx(74.4, 0.1)
    assert inter['upper_bound_kg'] == pytest.approx(125.6, 0.1)
    assert inter['lower_bound_kg'] >= 0

def test_safe_greater_than_aggressive():
    f_res, c_rec = get_base_fixtures(100.0)
    res = generate_risk_plan(f_res, c_rec)
    
    ag_alloc = res['plans']['aggressive']['total_allocated_kg']
    safe_alloc = res['plans']['safe']['total_allocated_kg']
    
    # Safe demand is 125.6, aggressive is 100. Since capacity is 150, safe_alloc should be > ag_alloc
    assert safe_alloc > ag_alloc

def test_high_capacity_low_risk_case():
    f_res, c_rec = get_base_fixtures(50.0, 500.0)
    res = generate_risk_plan(f_res, c_rec)
    assert res['risk_level'] == 'LOW'

def test_severe_shortage_high_risk_case():
    f_res, c_rec = get_base_fixtures(100.0, 105.0)
    # Upper bound is 125.6, Middle is 112.8, Aggressive is 100.
    # Cap 105. 
    # Aggressive is fulfilled fully. Balanced fails (105 < 112). Safe fails.
    # Therefore it should trigger HIGH.
    res = generate_risk_plan(f_res, c_rec)
    assert res['risk_level'] == 'HIGH'

def test_critical_risk_b2b_commitments():
    f_res, c_rec = get_base_fixtures(100.0, 90.0) # Base capacity smaller than B2B!
    f_res['segments'][0]['channel'] = 'B2B'
    f_res['segments'][0]['minimum_commitment_kg'] = 100.0 
    
    res = generate_risk_plan(f_res, c_rec)
    assert res['risk_level'] == 'CRITICAL'
    assert any("CRITICAL" in w for w in res['risk_factors'])
