from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict

class ForecastRequest(BaseModel):
    orders: List[Dict[str, Any]]
    marketing: List[Dict[str, Any]] = []

class CapacityEvaluateRequest(BaseModel):
    forecast_result: Dict[str, Any]
    capacity_record: Dict[str, Any]

class OptimizeRequest(BaseModel):
    strategy: str = "balanced"
    available_capacity_kg: float
    segments: List[Dict[str, Any]]

class ScenarioRequest(BaseModel):
    baseline_forecast: Dict[str, Any]
    baseline_capacity: Dict[str, Any]
    segments: List[Dict[str, Any]]
    scenario_changes: Dict[str, Any]
    strategy: str = "balanced"

class B2BEvaluateRequest(BaseModel):
    new_account: Dict[str, Any]
    available_capacity_kg: float
    segments: List[Dict[str, Any]]
    strategy: str = "balanced"

class MarketingRecommendRequest(BaseModel):
    marketing_history: List[Dict[str, Any]]
    forecast_result: Dict[str, Any]
    allocation_result: Dict[str, Any]
    total_budget_change_inr: float = 0.0

class PlanRequest(BaseModel):
    orders: List[Dict[str, Any]]
    capacity: List[Dict[str, Any]]
    marketing: List[Dict[str, Any]] = []
    b2b_accounts: List[Dict[str, Any]] = []
    target_period: str
    strategy: str = "balanced"
    risk_mode: str = "balanced"
    scenario: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "orders": [{"date": "2024-05", "region": "Mumbai", "channel": "D2C", "revenue_inr": 1000, "quantity_kg": 50}],
                "capacity": [{"date": "2024-06", "internal_capacity_kg": 5000, "available_capacity_kg": 5000}],
                "target_period": "2024-06",
                "strategy": "balanced",
                "risk_mode": "balanced"
            }
        }
    )
