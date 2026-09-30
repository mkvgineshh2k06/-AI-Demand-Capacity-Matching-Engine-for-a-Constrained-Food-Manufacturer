import pytest
import copy
from fastapi.testclient import TestClient
from app.main import app
from app.core.capacity import evaluate_capacity, calculate_capacity_uncertainty
from app.core.optimizer import allocate_capacity
from app.core.risk import generate_risk_plan
from app.core.scenarios import simulate_scenario
from app.core.b2b import evaluate_new_b2b_account

client = TestClient(app)

# Sample test fixture data
SAMPLE_SEGMENTS = [
    {
        "segment_id": "MUM_D2C",
        "region": "Mumbai",
        "channel": "D2C",
        "forecast_demand_kg": 60.0,
        "unit_price_inr": 500.0,
        "variable_cost_inr": 200.0,
        "minimum_commitment_kg": 0.0,
        "priority": "LOW"
    },
    {
        "segment_id": "MUM_B2B",
        "region": "Mumbai",
        "channel": "B2B",
        "forecast_demand_kg": 80.0,
        "unit_price_inr": 450.0,
        "variable_cost_inr": 200.0,
        "minimum_commitment_kg": 50.0,
        "priority": "HIGH"
    },
    {
        "segment_id": "DEL_D2C",
        "region": "Delhi",
        "channel": "D2C",
        "forecast_demand_kg": 40.0,
        "unit_price_inr": 520.0,
        "variable_cost_inr": 210.0,
        "minimum_commitment_kg": 0.0,
        "priority": "LOW"
    }
]

# =====================================================================
# 3A. ALLOCATION INVARIANTS
# =====================================================================

def test_invariant_capacity_upper_bound():
    """1. sum(allocation) <= available_capacity"""
    cap = 110.0
    res = allocate_capacity("balanced", cap, SAMPLE_SEGMENTS)
    tot_alloc = sum(s["allocated_kg"] for s in res["segments"])
    assert tot_alloc <= cap + 1e-4

def test_invariant_demand_upper_bound():
    """2. allocation_i <= forecast_demand_i"""
    res = allocate_capacity("revenue", 200.0, SAMPLE_SEGMENTS)
    for s in res["segments"]:
        assert s["allocated_kg"] <= s["forecast_demand_kg"] + 1e-4

def test_invariant_non_negative_allocation():
    """3. allocation_i >= 0"""
    res = allocate_capacity("fulfillment", 50.0, SAMPLE_SEGMENTS)
    for s in res["segments"]:
        assert s["allocated_kg"] >= 0.0

def test_invariant_non_negative_shortage():
    """4. shortage >= 0"""
    cap_res = evaluate_capacity({"total_demand_kg": 180.0}, {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0})
    assert cap_res["shortage_kg"] >= 0.0

def test_invariant_fulfillment_pct_range():
    """5. 0 <= fulfillment_pct <= 100"""
    res = allocate_capacity("balanced", 100.0, SAMPLE_SEGMENTS)
    assert 0.0 <= res["overall_fulfillment_pct"] <= 100.0
    for s in res["segments"]:
        assert 0.0 <= s["fulfillment_pct"] <= 100.0

def test_invariant_ample_capacity_full_fulfillment():
    """6. If capacity >= total demand: all demand should be fulfillable"""
    tot_demand = sum(s["forecast_demand_kg"] for s in SAMPLE_SEGMENTS) # 180 kg
    res = allocate_capacity("balanced", tot_demand + 50.0, SAMPLE_SEGMENTS)
    assert res["overall_fulfillment_pct"] == 100.0
    assert res["unfulfilled_demand_kg"] == 0.0

def test_invariant_zero_capacity_zero_allocation():
    """7. If capacity = 0: all allocation must equal zero"""
    res = allocate_capacity("balanced", 0.0, SAMPLE_SEGMENTS)
    assert res["total_allocated_kg"] == 0.0
    for s in res["segments"]:
        assert s["allocated_kg"] == 0.0

def test_invariant_capacity_monotonicity():
    """8. If capacity increases, total achievable fulfillment should NOT decrease"""
    res1 = allocate_capacity("balanced", 80.0, SAMPLE_SEGMENTS)
    res2 = allocate_capacity("balanced", 120.0, SAMPLE_SEGMENTS)
    assert res2["total_allocated_kg"] >= res1["total_allocated_kg"] - 1e-4

def test_invariant_demand_decrease_shortage_monotonicity():
    """9. If demand decreases while capacity remains unchanged: shortage should NOT increase"""
    c_eval1 = evaluate_capacity({"total_demand_kg": 200.0}, {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0})
    c_eval2 = evaluate_capacity({"total_demand_kg": 150.0}, {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0})
    assert c_eval2["shortage_kg"] <= c_eval1["shortage_kg"]

def test_invariant_reproducibility():
    """10. Same input + same seed/config: same deterministic output"""
    res1 = allocate_capacity("balanced", 110.0, SAMPLE_SEGMENTS)
    res2 = allocate_capacity("balanced", 110.0, SAMPLE_SEGMENTS)
    assert res1 == res2

# =====================================================================
# 3B. B2B TESTS
# =====================================================================

def test_b2b_commitment_boundaries():
    """Test B2B commitment smaller, equal, and greater than total capacity"""
    # Commitment < capacity
    res1 = allocate_capacity("balanced", 100.0, SAMPLE_SEGMENTS)
    assert len(res1["commitment_shortfalls"]) == 0
    
    # Commitments > capacity (50kg commitment vs 30kg capacity)
    over_commit_segs = copy.deepcopy(SAMPLE_SEGMENTS)
    over_commit_segs[1]["minimum_commitment_kg"] = 90.0
    res2 = allocate_capacity("balanced", 40.0, over_commit_segs)
    assert len(res2["commitment_shortfalls"]) > 0
    assert res2["commitment_shortfalls"][0]["shortfall_kg"] > 0

def test_b2b_new_account_evaluator():
    """Test B2B new account feasibility and extra capacity requirement"""
    new_acc = {
        "account_name": "Metro Hypermarket",
        "region": "Mumbai",
        "monthly_requirement_kg": 30.0,
        "target_price_inr": 480.0
    }
    eval_res = evaluate_new_b2b_account(new_acc, 200.0, SAMPLE_SEGMENTS, "balanced")
    assert "feasibility" in eval_res
    assert "minimum_extra_capacity_required_kg" in eval_res

# =====================================================================
# 3C. CAPACITY UNCERTAINTY TESTS
# =====================================================================

def test_capacity_uncertainty_ordering():
    """conservative_capacity <= expected_capacity <= optimistic_capacity"""
    unc = calculate_capacity_uncertainty(130.0, co_man_kg=20.0)
    assert unc["conservative_capacity_kg"] <= unc["expected_capacity_kg"] <= unc["optimistic_capacity_kg"]
    assert unc["conservative_capacity_kg"] >= 0.0
    assert unc["confidence_level"] == 0.80

def test_capacity_uncertainty_variance_expansion():
    """If historical production variability increases, uncertainty range should not shrink"""
    unc1 = calculate_capacity_uncertainty(100.0, historical_ratios=[0.98, 1.00, 1.02])
    unc2 = calculate_capacity_uncertainty(100.0, historical_ratios=[0.80, 1.00, 1.20])
    range1 = unc1["optimistic_capacity_kg"] - unc1["conservative_capacity_kg"]
    range2 = unc2["optimistic_capacity_kg"] - unc2["conservative_capacity_kg"]
    assert range2 >= range1

# =====================================================================
# 3D. RISK TESTS
# =====================================================================

def test_risk_level_categorization():
    """Severe shortage -> HIGH or CRITICAL risk; large spare -> LOW risk"""
    fc_high = {"total_demand_kg": 300.0, "segments": SAMPLE_SEGMENTS, "metrics": {"wape": 0.25}}
    cap_low = {"internal_capacity_kg": 50.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    r_high = generate_risk_plan(fc_high, cap_low, "balanced")
    assert r_high["risk_level"] in ["HIGH", "CRITICAL"]

    low_segs = [
        {"segment_id": "MUM_D2C", "region": "Mumbai", "channel": "D2C", "forecast_quantity_kg": 30.0, "unit_price_inr": 500.0, "variable_cost_inr": 200.0, "minimum_commitment_kg": 0.0, "priority": "LOW"}
    ]
    fc_low = {"total_demand_kg": 30.0, "segments": low_segs, "metrics": {"wape": 0.05}}
    cap_high = {"internal_capacity_kg": 300.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    r_low = generate_risk_plan(fc_low, cap_high, "balanced")
    assert r_low["risk_level"] == "LOW"


# =====================================================================
# 3E. SCENARIO IMMUTABILITY & MONOTONICITY
# =====================================================================

def test_scenario_immutability():
    """Scenario simulation must not mutate baseline input objects"""
    base_fc = {"total_demand_kg": 180.0, "segments": copy.deepcopy(SAMPLE_SEGMENTS)}
    base_fc_orig = copy.deepcopy(base_fc)
    base_cap = {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    
    simulate_scenario(base_fc, base_cap, SAMPLE_SEGMENTS, {"additional_co_manufacturing_capacity_kg": 40.0}, "balanced")
    assert base_fc == base_fc_orig

def test_scenario_co_man_reduces_shortage():
    """+co-man capacity should not increase shortage"""
    base_fc = {"total_demand_kg": 180.0, "segments": copy.deepcopy(SAMPLE_SEGMENTS)}
    base_cap = {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    
    sim_res = simulate_scenario(base_fc, base_cap, SAMPLE_SEGMENTS, {"additional_co_manufacturing_capacity_kg": 40.0}, "balanced")
    assert sim_res["scenario"]["shortage_kg"] <= 50.0

# =====================================================================
# 3F. API CONTRACT & MALFORMED INPUT TESTS
# =====================================================================

def test_api_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_api_optimize_contract():
    payload = {
        "strategy": "balanced",
        "available_capacity_kg": 130.0,
        "segments": SAMPLE_SEGMENTS
    }
    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "total_allocated_kg" in data
    assert "binding_constraints" in data
    assert "strategy_explanation" in data

def test_api_plan_contract():
    payload = {
        "orders": [{"date": "2024-05", "region": "Mumbai", "channel": "D2C", "revenue_inr": 1000, "quantity_kg": 50}],
        "capacity": [{"date": "2024-05", "internal_capacity_kg": 5000, "available_capacity_kg": 5000}],
        "target_period": "2024-05",
        "strategy": "balanced",
        "risk_mode": "balanced"
    }
    response = client.post("/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "decision_explanation" in data
    assert "capacity" in data
    assert "gap" in data

def test_api_validation_summary_contract():
    response = client.get("/validation/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "verified"
    assert "tests" in data
    assert "forecast_validation" in data
    assert "optimizer_validation" in data
    assert data["deterministic"] is True


