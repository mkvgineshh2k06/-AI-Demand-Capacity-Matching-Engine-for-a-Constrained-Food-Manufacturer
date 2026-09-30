import requests
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_e2e_smoke_test():
    print("--- 1. Testing /health ---")
    r_health = client.get("/health")
    assert r_health.status_code == 200
    print("Health response:", r_health.json())

    print("\n--- 2. Testing /validation/summary ---")
    r_val = client.get("/validation/summary")
    assert r_val.status_code == 200
    print("Validation summary:", r_val.json())

    print("\n--- 3. Testing Demo Baseline Scenario ---")
    segments = [
        {"segment_id": "MUM_D2C", "region": "Mumbai", "channel": "D2C", "forecast_demand_kg": 60.0, "unit_price_inr": 500, "variable_cost_inr": 200},
        {"segment_id": "MUM_B2B", "region": "Mumbai", "channel": "B2B", "forecast_demand_kg": 80.0, "unit_price_inr": 450, "variable_cost_inr": 200, "minimum_commitment_kg": 50, "priority": "HIGH"},
        {"segment_id": "DEL_D2C", "region": "Delhi", "channel": "D2C", "forecast_demand_kg": 40.0, "unit_price_inr": 520, "variable_cost_inr": 210}
    ]

    r_cap = client.post("/capacity/evaluate", json={
        "forecast_result": {"total_demand_kg": 180.0},
        "capacity_record": {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0}
    })
    assert r_cap.status_code == 200
    cap_data = r_cap.json()
    print("Capacity evaluation (180kg demand vs 130kg cap):", cap_data)
    assert cap_data["shortage_kg"] == 50.0

    print("\n--- 4. Testing /optimize (BALANCED mode) ---")
    r_opt = client.post("/optimize", json={
        "strategy": "balanced",
        "available_capacity_kg": 130.0,
        "segments": segments
    })
    assert r_opt.status_code == 200
    opt_data = r_opt.json()
    print("Baseline Allocation Total:", opt_data["total_allocated_kg"])
    print("Binding Constraints:", opt_data["binding_constraints"])
    print("Strategy Explanation:", opt_data["strategy_explanation"])
    print("Segment Explanations:", [s["explanation"] for s in opt_data["segments"]])

    print("\n--- 5. Testing /scenario (+40kg co-man capacity) ---")
    r_scen = client.post("/scenario", json={
        "baseline_forecast": {"total_demand_kg": 180.0, "segments": segments},
        "baseline_capacity": {"internal_capacity_kg": 130.0, "co_manufacturing_capacity_kg": 0.0, "downtime_kg": 0.0, "reserved_capacity_kg": 0.0},
        "segments": segments,
        "scenario_changes": {"additional_co_manufacturing_capacity_kg": 40.0},
        "strategy": "balanced"
    })
    assert r_scen.status_code == 200
    scen_data = r_scen.json()
    print("Scenario Capacity:", scen_data["scenario"]["capacity_kg"])
    print("Scenario Shortage (decreased from 50 to 10kg):", scen_data["scenario"]["shortage_kg"])
    assert scen_data["scenario"]["capacity_kg"] == 170.0
    assert scen_data["scenario"]["shortage_kg"] == 10.0

    print("\n--- 6. Testing /b2b/evaluate (New account 30kg) ---")
    r_b2b = client.post("/b2b/evaluate", json={
        "new_account": {"customer_name": "Metro Retail", "region": "Mumbai", "monthly_requirement_kg": 30.0, "unit_price_inr": 480.0},
        "available_capacity_kg": 130.0,
        "segments": segments,
        "strategy": "balanced"
    })
    assert r_b2b.status_code == 200
    b2b_data = r_b2b.json()
    print("B2B Feasibility:", b2b_data["feasibility"])
    print("Minimum Extra Capacity Needed:", b2b_data["minimum_extra_capacity_required_kg"])

    print("\n--- 7. Testing /plan (Final Operational Plan) ---")
    r_plan = client.post("/plan", json={
        "orders": [{"date": "2024-05", "region": "Mumbai", "channel": "D2C", "revenue_inr": 1000, "quantity_kg": 50}],
        "capacity": [{"date": "2024-05", "internal_capacity_kg": 5000, "available_capacity_kg": 5000}],
        "target_period": "2024-05",
        "strategy": "balanced",
        "risk_mode": "balanced"
    })
    assert r_plan.status_code == 200
    plan_data = r_plan.json()
    print("Plan Status:", plan_data["status"])
    print("Decision Explanation Summary:", plan_data["decision_explanation"]["summary"])
    print("Capacity Uncertainty:", plan_data["capacity"])
    print("Gap Matrix:", plan_data["gap"])

    print("\n✅ ALL 8 ENDPOINTS PASSED E2E SMOKE TEST CLEANLY!")

if __name__ == "__main__":
    run_e2e_smoke_test()
