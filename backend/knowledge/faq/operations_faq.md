# BioKraft Foods Operations FAQ

## Q1: What is the Balanced allocation strategy?
**Answer**: The Balanced strategy is BioKraft's baseline LP optimization policy. It balances B2B contractual SLA commitments (minimum 85% floor with a 10x penalty weight) with D2C consumer market velocity (1.0 penalty weight), ensuring key customer accounts stay protected while maintaining consumer retail presence.

## Q2: Why is Mumbai B2B receiving more capacity allocation than other segments?
**Answer**: Mumbai B2B is BioKraft's highest-volume contractual customer tier with strict SLA penalty clauses and high gross unit margin (₹420/kg). The linear program prioritizes Mumbai B2B to prevent contract breach penalties and maximize net revenue contribution.

## Q3: Why is there a capacity shortage this month?
**Answer**: A shortage occurs when projected multi-channel demand exceeds usable capacity (net of plant maintenance downtime and safety reserves). For instance, in May 2024, forecast demand is 5,160 kg while usable capacity is 3,950 kg, producing a 1,212 kg deficit gap.

## Q4: What happens if co-manufacturing capacity increases by 40 kg or 500 kg?
**Answer**: Increasing co-manufacturing capacity directly expands net usable capacity. A 500 kg co-manufacturing expansion reduces the shortage gap from 1,212 kg to 712 kg, increasing overall system fulfillment rate by ~9.6% and unlocking ~₹2.0L in unfulfilled revenue.

## Q5: Can we onboard a new restaurant or account requiring 30 kg/month?
**Answer**: Yes, onboarding a 30 kg/month account is evaluated using the B2B Account Evaluator. If usable capacity headroom is available or co-manufacturing can be activated, the engine assesses the SLA breach risk score and net revenue contribution before confirming acceptance.

## Q6: Should we increase marketing spend in Pune or Mumbai?
**Answer**: Marketing spend recommendations depend on territory fulfillment rate. If a territory is severely capacity-constrained (fulfillment < 70% or shortage > 150 kg), the marketing engine recommends reducing or reallocating ad spend, because acquiring additional demand when capacity is exhausted leads to wasteful customer churn. Spend should only be increased when fulfillment is high (> 85%) and capacity headroom exists.

## Q7: What assumptions are being used by the engine?
**Answer**: Key operational assumptions include:
- Base internal plant capacity: 3,500 kg/month
- Base co-manufacturing capacity: 800 kg/month
- Maintenance downtime deduction: 150 kg/month
- Safety reserve buffer: 200 kg/month
- Average unit price: ₹400/kg (B2B: ₹420/kg, D2C: ₹380/kg)
- Average B2B SLA penalty multiplier: 10x
