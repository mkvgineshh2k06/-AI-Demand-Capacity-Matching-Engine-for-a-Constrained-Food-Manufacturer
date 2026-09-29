import pandas as pd
import numpy as np
import pytest
from app.core.preprocessing import prepare_forecasting_dataset, get_latest_segment_state
from app.core.data_loader import load_orders, load_marketing

def test_prepare_forecasting_dataset_no_leakage():
    # Construct a deterministic mock dataframe
    dates = pd.date_range("2024-01-01", "2024-02-15", freq="D")
    df_orders = pd.DataFrame({
        'date': dates,
        'order_id': [f"ORD{i}" for i in range(len(dates))],
        'channel': ['D2C'] * len(dates),
        'region': ['Mumbai'] * len(dates),
        'customer_id': ['CUST1'] * len(dates),
        'quantity_kg': [10.0] * len(dates), # 10kg per day => 70kg per week
        'unit_price_inr': [100.0] * len(dates),
        'discount_pct': [0.0] * len(dates),
        'revenue_inr': [1000.0] * len(dates),
        'fulfilled_quantity_kg': [10.0] * len(dates)
    })
    
    df_mkt = pd.DataFrame({
        'date': [dates[0], dates[7], dates[14]],
        'region': ['Mumbai'] * 3,
        'channel': ['D2C'] * 3,
        'marketing_spend_inr': [100, 200, 300],
        'impressions': [0]*3, 'clicks': [0]*3, 'conversions': [0]*3, 
        'attributed_quantity_kg': [0]*3, 'attributed_revenue_inr': [0]*3
    })
    
    # Run pipeline
    res = prepare_forecasting_dataset(df_orders, df_mkt, frequency="W")
    
    # 1. Marketing correctness
    # Week 1 ends Jan 7 (so dates[0] to dates[6] is 1 week). 
    assert 'marketing_spend' in res.columns
    # 2. No leakage check
    # Check that lag_1 for second week equals the target_quantity of first week
    assert res.iloc[1]['lag_1'] == res.iloc[0]['target_quantity_kg']
    # rolling mean of 4 shifted -> for week 3 (idx 2), rolling mean should just use week 1 & 2 target
    assert res.iloc[2]['rolling_mean_4'] == np.mean([res.iloc[0]['target_quantity_kg'], res.iloc[1]['target_quantity_kg']])

def test_get_latest_segment_state():
    dates = pd.date_range("2024-01-01", "2024-01-20", freq="D")
    df_orders = pd.DataFrame({
        'date': dates, 'order_id': [f"O{i}" for i in range(len(dates))],
        'channel': ['B2B'] * len(dates), 'region': ['Pune'] * len(dates),
        'quantity_kg': [5.0] * len(dates), 'revenue_inr': [50.0] * len(dates)
    })
    res = prepare_forecasting_dataset(df_orders, pd.DataFrame(), frequency="W")
    state = get_latest_segment_state(res)
    assert len(state) == 1
    assert state.iloc[0]['period'] == res.iloc[-1]['period']
    assert state.iloc[0]['target_quantity_kg'] == res.iloc[-1]['target_quantity_kg']
    
def test_data_loader_validation():
    # Will use invalid data to verify it raises proper errors
    df_invalid = pd.DataFrame({
        'date': ['2023-01-01'],
        'order_id': ['DUP'],
        # missing channel, missing region etc.
    })
    # Since we need a csv on disk to test loader directly, we can just use pytest.raises over logic or mock it, 
    # but the simplest way is just create temp CSV.
    import os
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdirname:
        path = os.path.join(tmpdirname, 'orders.csv')
        df_invalid.to_csv(path, index=False)
        with pytest.raises(ValueError):
            load_orders(path)
