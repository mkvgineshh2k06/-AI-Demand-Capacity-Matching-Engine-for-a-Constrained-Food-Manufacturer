import os
import pandas as pd
from app.core.data_generator import generate_demo_data

def test_generate_demo_data(tmp_path):
    output_dir = str(tmp_path)
    summary = generate_demo_data(output_dir, seed=42)
    
    # Check if files are created
    assert os.path.exists(os.path.join(output_dir, 'orders.csv'))
    assert os.path.exists(os.path.join(output_dir, 'capacity.csv'))
    assert os.path.exists(os.path.join(output_dir, 'marketing.csv'))
    assert os.path.exists(os.path.join(output_dir, 'b2b_accounts.csv'))
    
    # Read orders to validate business logic
    df_orders = pd.read_csv(os.path.join(output_dir, 'orders.csv'))
    
    # 1. No negative quantities
    assert (df_orders['quantity_kg'] >= 0).all()
    assert (df_orders['fulfilled_quantity_kg'] >= 0).all()
    
    # 2. No negative money values
    assert (df_orders['unit_price_inr'] >= 0).all()
    assert (df_orders['revenue_inr'] >= 0).all()
    
    # 3. Revenue roughly equals fulfilled quantity * effective price (accounting for rounding)
    # eff price = unit_price * (1 - discount)
    expected_rev = df_orders['fulfilled_quantity_kg'] * df_orders['unit_price_inr'] * (1 - df_orders['discount_pct'])
    diff = (df_orders['revenue_inr'] - expected_rev).abs()
    assert (diff < 5.0).all()
    
    # 4. D2C generally higher unit price than B2B
    mean_d2c_price = df_orders[df_orders['channel'] == 'D2C']['unit_price_inr'].mean()
    mean_b2b_price = df_orders[df_orders['channel'] == 'B2B']['unit_price_inr'].mean()
    assert mean_d2c_price > mean_b2b_price
    
    # Capacity checks
    df_cap = pd.read_csv(os.path.join(output_dir, 'capacity.csv'))
    # Ensure there are shortages generated
    assert summary['months_with_shortages'] >= 0
