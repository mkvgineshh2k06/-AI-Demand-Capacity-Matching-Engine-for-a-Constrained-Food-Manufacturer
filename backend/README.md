# BioKraft Foods: AI Demand-Capacity Matching Engine (Backend)

## Problem Overview
BioKraft Foods is an early-stage food formulation manufacturer facing critical capacity bottlenecks. The company balances direct-to-consumer (D2C) growth against highly prioritized B2B supply commitments. This project acts as an intelligence decision engine natively detecting when demand outscales structural capacity—optimizing routing paths to preserve margin, recommending emergency co-manufacturing activations, testing hypothetical expansion scenarios (What-If logic), shifting trapped zero-sum marketing spend cleanly, and safeguarding baseline B2B SLAs deterministically. 

## Backend Architecture
This repository implements an aggressively decoupled intelligence backend separated completely from standard frontend frameworks. The architecture embraces strict functional immutability, passing pandas DataFrames seamlessly through specialized core modules before bridging via a FastAPI JSON rest service. 

## Modules Description
- **Module 1 (Data Gen):** `data_generator.py` (Reproducible 18-month synthetic capacity/orders/marketing pipeline mapping business seasonality curves.)
- **Module 2 (Preprocessing):** `data_loader.py` & `preprocessing.py` (Leakage-free dataset engineering utilizing deterministic `shift(1)` chronological mappings.)
- **Module 3 (Forecasting):** `forecasting.py` (Machine Learning autoregressive engine primarily mapping via `HistGradientBoostingRegressor` backed by strict validation intervals.)
- **Module 4 (Capacity Limits):** `capacity.py` (Rule-bound deterministic factory utilization computations.)
- **Module 5 (Optimization):** `optimizer.py` (Pure linear-programming integration leveraging `Google OR-Tools GLOP` routing slack variables defending B2B boundaries under impossible structural constraints.)
- **Module 6 (Scenarios):** `scenarios.py` (Deepcopy-driven What-If permutations isolating demand bounds against capacity variations seamlessly.)
- **Module 7 (B2B Evaluation):** `b2b.py` (Binary search mathematical loops defining exact capacity `kg` additions required for condition feasibility integrations.)
- **Module 8 (Marketing Intelligence):** `marketing.py` (Zero-sum budget tracking dynamically defunding stock-out sectors logically routing marketing to high-capacity yields.)
- **Module 9 (Risk Planner):** `risk.py` (Scaling 80% forecast-error bounds tracking CRITICAL thresholds actively against unfulfilled metrics.)
- **Module 10 (Pipeline Planner):** `recommendations.py` & `planner.py` (Massive architectural orchestration layer formatting text rules against unified system intelligence schemas.)
- **Module 11 (API Layer):** `routes.py`, `schemas.py`, & `main.py` (FastAPI integration masking stack exceptions beneath structured endpoint validators heavily protecting underlying algorithms.)

## Setup Instructions
The runtime explicitly targets modern python capabilities (Python 3.11+ natively).
### Virtual Environment & Dependencies
```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate it (Windows)
venv\Scripts\activate
# (Mac/Linux: source venv/bin/activate)

# 3. Install core dependencies
pip install -r requirements.txt
```

### Core Execution Commands
**Generate Demo Data:**
```bash
python -c "from app.core.data_generator import generate_demo_data; generate_demo_data()"
```

**Run End-to-End Test Validations (PyTest):**
```bash
pytest
```

**Start the API Server (FastAPI):**
```bash
uvicorn app.main:app --reload --port 8000
```
- **Swagger Documentation:** Available instantly at [http://localhost:8000/docs](http://localhost:8000/docs) after boot. 

## Core Endpoint Table

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Connection heartbeat validations. |
| `/forecast` | POST | Returns baseline ML forecasting horizons natively. |
| `/capacity/evaluate` | POST | Structural calculations matching forecasting points against raw configurations. |
| `/optimize` | POST | Determines allocations natively targeting configurable (`balanced`, `revenue`, `fulfillment`) constraints. |
| `/scenario` | POST | Analyzes theoretical impacts dynamically adjusting capacity bounds or marketing shifts natively. |
| `/b2b/evaluate` | POST | Resolves SLA constraints natively calculating exact expansions required for onboarding operations. |
| `/marketing/recommend` | POST | Defunds capacity bottlenecks mathematically mapping capital dynamically towards scaling operations. |
| `/plan` | POST | **(Primary Gateway)** Chains systems 1-9 natively evaluating end-to-end optimizations producing textual human-readable programmatic reasoning formats. |

## Interfacing with `/plan` (Primary API Route)

### Sample Request Endpoint Submission
```json
{
  "orders": [
    {"date": "2024-05", "region": "Mumbai", "channel": "D2C", "revenue_inr": 1000, "quantity_kg": 50}
  ],
  "capacity": [
    {
      "date": "2024-06",
      "internal_capacity_kg": 5000.0,
      "available_capacity_kg": 5000.0
    }
  ],
  "target_period": "2024-06",
  "strategy": "balanced",
  "risk_mode": "balanced"
}
```

### Sample Expected Output Payload
```json
{
  "status": "success",
  "target_period": "2024-06",
  "forecast": {
    "total_demand_kg": 0.0,
    "segments": [],
    "uncertainty": {}
  },
  "capacity": {
    "internal_capacity_kg": 5000.0,
    "available_capacity_kg": 5000.0
  },
  "gap": {
    "shortage_kg": 0.0,
    "capacity_utilization_pct": 0.0
  },
  "plan": {
    "strategy": "balanced",
    "risk_mode": "balanced",
    "expected_revenue_inr": 0.0,
    "b2b_fulfillment_pct": 100.0
  },
  "recommendations": [
    {
      "type": "MAINTAIN_CURRENT_PLAN",
      "priority": "LOW",
      "title": "Operational Grid Stable",
      "reason": "Current strategy balances demand, capacity, and marketing budgets safely bounding all thresholds successfully."
    }
  ],
  "risk": {
    "level": "LOW",
    "factors": []
  }
}
```


### Explanation of Optimization Strategies
The LP Engine utilizes dynamic variable mapping isolating strategic objectives programmatically:
1. **Revenue Maximization:** Bounds constraints aggressively favoring segments scaling `contribution margins` highest.
2. **Fulfillment Bias:** Defends `Priority=HIGH` B2B SLA limits aggressively, scaling operational buffers predominantly targeting operational metrics. 
3. **Balanced (Default):** Numerically scales constraints matching combinations averaging `margin targets` against deterministic `SLA guarantees`. 

## Technical Considerations & Hackathon Assumptions
- **Storage Modularity:** Forecasting endpoints intercept structures generically simulating local `joblib` dumps natively for simplistic demonstration constraints instead of connecting external relational RDS pipelines natively.
- **Leakage Isolations:** Time series engineering drops the active `targets` immediately preventing temporal boundaries overriding predictions illegitimately.
- **Constraints Resolution:** Google OR-Tools actively routes impossible B2B volumes (demands mathematically > capacity possibilities unconditionally) down decoupled slack tracks preventing crashes while penalizing the operational scores realistically.
