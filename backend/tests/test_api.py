import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_forecast_endpoint():
    # Submit purely empty constraints leveraging the fallback test architecture to verify routing intactness
    response = client.post("/forecast", json={"orders": [], "marketing": []})
    assert response.status_code == 200
    data = response.json()
    assert 'total_demand_kg' in data
    assert 'segments' in data

def test_capacity_evaluate_endpoint():
    payload = {
        "forecast_result": {"total_demand_kg": 100.0, "segments": []},
        "capacity_record": {"internal_capacity_kg": 50.0}
    }
    response = client.post("/capacity/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    # 100 demand vs 50 cap -> 50 shortage
    assert data["shortage_kg"] == 50.0

def test_optimize_endpoint():
    payload = {
        "strategy": "fulfillment",
        "available_capacity_kg": 100.0,
        "segments": [{"segment_id": "s1", "forecast_demand_kg": 50.0}]
    }
    response = client.post("/optimize", json=payload)
    assert response.status_code == 200
    assert response.json()["total_allocated_kg"] == 50.0

def test_plan_endpoint():
    payload = {
        "orders": [],
        "capacity": [{"date": "2024-05", "internal_capacity_kg": 1000.0}],
        "target_period": "2024-05"
    }
    response = client.post("/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "recommendations" in data
    assert "risk" in data
    assert "forecast" in data

def test_validation_obscuration():
    # Send bad structure expecting the masked 422
    response = client.post("/plan", json={"malformed": "data"})
    assert response.status_code == 422
    assert "detail" in response.json()
    assert "Schema validation failed" in response.json()['detail']
