# BioKraft Allocation Strategies & Optimization Policies

## 1. Overview of Multi-Strategy Allocation Optimizer
The BioKraft Demand-Capacity Engine uses Linear Programming (LP) optimization via Google OR-Tools to solve the constrained capacity allocation problem across regional demand segments (Mumbai, Pune, Delhi, Bengaluru, Chennai) and sales channels (B2B, D2C).

## 2. Allocation Strategy Definitions

### Balanced Strategy (Default Baseline)
- **Objective**: Equalize B2B contract stability with D2C retail presence while maximizing overall system throughput.
- **LP Penalty Weights**:
  - B2B Shortfall Penalty Weight: `10.0`
  - D2C Shortfall Penalty Weight: `1.0`
  - B2B Minimum Commitment Floor: `85.0%` of total B2B forecast demand.
- **Use Case**: Standard operational plan balancing contractual compliance and consumer market share.

### Max Revenue Strategy (Profit-Focused)
- **Objective**: Maximize total projected gross turnover (INR) by prioritizing high-margin channels and accounts.
- **LP Penalty Weights**:
  - B2B Shortfall Penalty Weight: `50.0` (high margin protection)
  - D2C Shortfall Penalty Weight: `0.5`
  - B2B Minimum Commitment Floor: `98.0%` SLA threshold.
- **Use Case**: Periods of high raw material cost or cash flow optimization where unit margins take precedence over volume delivery.

### Max Fulfillment Strategy (Volume-Focused)
- **Objective**: Maximize total kilograms delivered across all channels regardless of margin differentials.
- **LP Penalty Weights**:
  - B2B Shortfall Penalty Weight: `2.0`
  - D2C Shortfall Penalty Weight: `1.5`
  - Relative Channel Parity: Equalized shortfall distribution across D2C retail segments.
- **Use Case**: Promotional pushes, new product launches, or market share defense where maximizing consumer reach is paramount.
