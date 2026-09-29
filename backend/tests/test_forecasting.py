import pandas as pd
import pytest
from app.core.forecasting import forecast_next_period, DemandForecaster

def test_forecasting_logic():
    # Construct synthetic data of enough length (must be > 4 periods for split)
    dates = pd.date_range("2024-01-01", periods=10, freq="W") # 10 weeks
    
    orders = []
    for d in dates:
        for r in ['Mumbai', 'Pune']:
            orders.append({
                'date': d.strftime('%Y-%m-%d'),
                'order_id': f"O_{d.strftime('%Y%m%d')}_{r}",
                'channel': 'D2C',
                'region': r,
                'customer_id': 'C1',
                'quantity_kg': 50.0,
                'unit_price_inr': 100.0,
                'discount_pct': 0.0,
                'revenue_inr': 5000.0,
                'fulfilled_quantity_kg': 50.0
            })
    df_orders = pd.DataFrame(orders)
    
    mkt = []
    for d in dates:
        for r in ['Mumbai', 'Pune']:
            mkt.append({
                'date': d.strftime('%Y-%m-%d'),
                'region': r,
                'channel': 'D2C',
                'marketing_spend_inr': 1000.0,
                'impressions': 100,
                'clicks': 10,
                'conversions': 1,
                'attributed_quantity_kg': 5.0,
                'attributed_revenue_inr': 500.0
            })
    df_mkt = pd.DataFrame(mkt)
    
    # 1. No crash if future_marketing_plan is omitted
    res = forecast_next_period(df_orders, df_mkt, horizon_weeks=4, future_marketing_plan=None)
    
    # 2. Horizon works
    assert res['horizon_weeks'] == 4
    
    # 3. Every expected region/channel segment returned
    segments_found = {(s['region'], s['channel']) for s in res['segments']}
    assert segments_found == {('Mumbai', 'D2C'), ('Pune', 'D2C')}
    
    # 4. Non-negative predictions
    for s in res['segments']:
        assert s['forecast_quantity_kg'] >= 0.0
        
    # 5. Total equals segment totals
    seg_sum = round(sum(s['forecast_quantity_kg'] for s in res['segments']), 2)
    assert res['total_demand_kg'] == seg_sum
    assert res['d2c_demand_kg'] == seg_sum
    assert res['b2b_demand_kg'] == 0.0
    
    # 6. Check metrics populated
    assert 'mae' in res['metrics']
    assert 'rmse' in res['metrics']
    assert 'wape' in res['metrics']
