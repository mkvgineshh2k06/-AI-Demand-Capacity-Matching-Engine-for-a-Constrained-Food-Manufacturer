# BioKraft Forecasting & Optimization Methodology

## 1. Demand Forecasting Engine (GBM / Time-Series)
- **Model Architecture**: Gradient Boosting Machine (GBM) time-series model trained on 18 months of historical daily orders, regional promotional calendars, and seasonality patterns.
- **Metrics & Validation**: Evaluated using Weighted Absolute Percentage Error (WAPE) and Mean Absolute Percentage Error (MAPE). Standard baseline WAPE is 4.2% across core territories.
- **Uncertainty Bounds**: Generates empirical prediction intervals:
  - `P10` (Conservative / Lower bound)
  - `P50` (Expected / Median forecast)
  - `P90` (Aggressive / Upper bound spike forecast)

## 2. Capacity Evaluation Engine
- **Usable Capacity Calculation**:
  $$\text{Usable Capacity} = \text{Internal Plant Capacity} + \text{Co-Manufacturing Capacity} - \text{Downtime Deduction} - \text{Reserved Buffer}$$
- **Shortage Calculation**:
  $$\text{Shortage Gap} = \max(0, \text{Total Forecast Demand} - \text{Usable Capacity})$$
- **Capacity Utilization**:
  $$\text{Utilization \%} = \frac{\text{Total Forecast Demand}}{\text{Usable Capacity}} \times 100$$
  - Utilization $\ge 100\%$ triggers Peak Load / Deficit Warning status.
