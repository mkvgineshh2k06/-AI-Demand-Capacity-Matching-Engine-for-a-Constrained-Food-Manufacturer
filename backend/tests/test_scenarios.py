import pytest
from app.core.scenarios import simulate_scenario

def get_fixtures():
    base_forecast = {"total_demand_kg": 100.0}
    base_cap = {
        "internal_capacity_kg": 100.0,
        "co_manufacturing_capacity_kg": 0.0,
        "downtime_kg": 0.0,
        "reserved_capacity_kg": 0.0
    }
    segs = [
        {"segment_id": "seg_1", "region": "Mumbai", "channel": "D2C", "forecast_demand_kg": 100.0, "unit_price_inr": 10.0}
    ]
    return base_forecast, base_cap, segs

def test_scenario_no_change():
    base_f, base_c, segs = get_fixtures()
    res = simulate_scenario(base_f, base_c, segs, {})
    
    assert res['impact']['demand_change_kg'] == 0.0
    assert res['impact']['capacity_change_kg'] == 0.0
    assert res['impact']['shortage_change_kg'] == 0.0
    assert res['impact']['revenue_change_inr'] == 0.0
    assert res['impact']['fulfillment_change_pct_points'] == 0.0
    # Immutability check
    assert base_f["total_demand_kg"] == 100.0

def test_scenario_add_co_manufacturing():
    base_f, base_c, segs = get_fixtures()
    # Baseline: demand 100, cap 100 -> shortage 0
    # Suppose demand jumps to 150 without co_man -> shortage 50
    # WITH co-man 50 -> shortage 0
    segs[0]['forecast_demand_kg'] = 150.0  # Adjust base fixture intentionally for this test setup
    base_f["total_demand_kg"] = 150.0
    
    changes = {"additional_co_manufacturing_capacity_kg": 50.0}
    res = simulate_scenario(base_f, base_c, segs, changes)
    
    assert res['baseline']['shortage_kg'] == 50.0
    assert res['scenario']['shortage_kg'] == 0.0
    assert res['impact']['shortage_change_kg'] == -50.0
    assert res['impact']['capacity_change_kg'] == 50.0

def test_scenario_add_demand_and_marketing():
    base_f, base_c, segs = get_fixtures()
    changes = {
        "demand_growth_pct": 10.0,
        "marketing_spend_changes": {"Mumbai_D2C": 1000.0} # 1000 * 0.05 = 50kg extra
    }
    res = simulate_scenario(base_f, base_c, segs, changes)
    # base demand: 100. Local growth 10% -> 110. Marketing -> 110 + 50 = 160.
    assert res['scenario']['demand_kg'] == 160.0
    assert res['impact']['demand_change_kg'] == 60.0

def test_scenario_new_b2b_account():
    base_f, base_c, segs = get_fixtures()
    changes = {
        "new_b2b_account": {
            "segment_id": "b2b_new",
            "region": "Pune",
            "requested_monthly_quantity": 40.0,
            "unit_price": 5.0,
            "minimum_commitment": 40.0
        }
    }
    res = simulate_scenario(base_f, base_c, segs, changes, strategy="fulfillment")
    assert res['scenario']['demand_kg'] == 140.0
    assert res['impact']['demand_change_kg'] == 40.0
    assert len(res['updated_allocation']['segments']) == 2
    b2b_result = next(x for x in res['updated_allocation']['segments'] if x['channel'] == 'B2B')
    assert b2b_result['forecast_demand_kg'] == 40.0

def test_scenario_downtime_increase():
    base_f, base_c, segs = get_fixtures()
    changes = {"downtime_change_kg": 20.0} # cuts baseline cap from 100 to 80
    res = simulate_scenario(base_f, base_c, segs, changes)
    assert res['impact']['capacity_change_kg'] == -20.0
    assert res['impact']['shortage_change_kg'] == 20.0 # From 0 to 20
    assert res['impact']['fulfillment_change_pct_points'] < 0.0
