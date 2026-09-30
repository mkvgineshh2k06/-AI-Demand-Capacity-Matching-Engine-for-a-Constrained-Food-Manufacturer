# BioKraft Risk Planner, Marketing Intelligence, and B2B Evaluator Methodology

## 1. Risk-Aware Planning Modes
- **Safe Mode**: Plans capacity and allocation against the 90th percentile demand forecast bound (`P90`), holding a 200 kg safety buffer against plant yield variance. Prevents stockout risk at the cost of potential unallocated surplus.
- **Balanced Risk Mode**: Plans against the median demand forecast (`P50`) with an 80th percentile buffer, balancing stockout risk with capital efficiency.
- **Aggressive Risk Mode**: Plans against lower demand bounds (`P10`), operating with minimal capacity buffers to maximize plant yield throughput and minimize co-manufacturing overhead.

## 2. Capacity-Aware Marketing Intelligence
- **Core Principle**: Marketing spend in capacity-constrained territories must be throttled to avoid generating unfulfillable consumer demand.
- **Action Triggers**:
  - `REALLOCATE_OUT` / `REDUCE`: Triggered when territory fulfillment falls below 70% or capacity deficit exceeds 150 kg.
  - `HOLD`: Triggered when fulfillment is between 70%–85% with ROAS > 4.0x. Spending is capped to preserve fulfillment margins.
  - `INCREASE` / `SCALE`: Triggered when territory fulfillment > 85% AND unused capacity headroom > 100 kg.

## 3. B2B Account Onboarding Evaluator
- **Feasibility Criteria**:
  - Evaluates new B2B contract requests (requested volume in kg/month, unit price in INR, priority tier).
  - Calculates required co-manufacturing expansion, SLA breach risk score (0–100), and net margin impact.
  - Recommends acceptance conditionally if available headroom or co-manufacturing capacity can cover contract commitments without degrading existing P1 accounts.
