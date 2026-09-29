import os
import pandas as pd
from typing import Optional

def _get_data_path(filename: str) -> str:
    """Helper to get path to data file."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/demo"))
    return os.path.join(base_dir, filename)

def load_orders(filepath: Optional[str] = None) -> pd.DataFrame:
    if filepath is None:
        filepath = _get_data_path('orders.csv')
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Orders file not found at {filepath}")
        
    df = pd.read_csv(filepath)
    req_cols = ['date', 'order_id', 'channel', 'region', 'customer_id', 
                'quantity_kg', 'unit_price_inr', 'discount_pct', 
                'revenue_inr', 'fulfilled_quantity_kg']
    
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Orders data missing required columns: {missing}")
    
    # Parse dates
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    if df['date'].isna().any():
        raise ValueError("Orders data contains invalid dates")
        
    # Standardize strings
    df['channel'] = df['channel'].str.upper().str.strip()
    df['region'] = df['region'].str.title().str.strip()
    
    # Validate channel
    if not df['channel'].isin(['D2C', 'B2B']).all():
        raise ValueError("Orders data contains invalid channels, must be D2C or B2B")
        
    # Validation filters (remove invalid rows instead of crashing unless we strictly want to reject everything, 
    # but the instructions say "Remove impossible negative values or reject invalid rows")
    # We will raise error if we find negatives to be safe.
    if (df['quantity_kg'] < 0).any():
        raise ValueError("Orders data contains negative quantity")
    if (df['unit_price_inr'] < 0).any():
        raise ValueError("Orders data contains negative unit price")
    if (df['revenue_inr'] < 0).any():
        raise ValueError("Orders data contains negative revenue")
        
    # Prevent duplicate order IDs
    if df['order_id'].duplicated().any():
        raise ValueError("Duplicate order_id found")
        
    # Sort chronologically
    df.sort_values(by='date', inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    return df

def load_capacity(filepath: Optional[str] = None) -> pd.DataFrame:
    if filepath is None:
        filepath = _get_data_path('capacity.csv')
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Capacity file not found at {filepath}")
        
    df = pd.read_csv(filepath)
    req_cols = ['month', 'internal_capacity_kg', 'co_manufacturing_capacity_kg', 
                'downtime_kg', 'reserved_capacity_kg', 'available_capacity_kg']
    
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Capacity data missing required columns: {missing}")
        
    # Check negatives
    numeric_cols = [c for c in req_cols if c != 'month']
    for c in numeric_cols:
        if (df[c] < 0).any():
            raise ValueError(f"Capacity data contains negative value in {c}")
            
    # Parse dates safely
    df['month_dt'] = pd.to_datetime(df['month'], format='%Y-%m', errors='coerce')
    if df['month_dt'].isna().any():
        raise ValueError("Capacity data contains invalid month strings")
        
    df.sort_values(by='month_dt', inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    return df

def load_marketing(filepath: Optional[str] = None) -> pd.DataFrame:
    if filepath is None:
        filepath = _get_data_path('marketing.csv')
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Marketing file not found at {filepath}")
        
    df = pd.read_csv(filepath)
    req_cols = ['date', 'region', 'channel', 'marketing_spend_inr', 'impressions', 
                'clicks', 'conversions', 'attributed_quantity_kg', 'attributed_revenue_inr']
                
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Marketing data missing required columns: {missing}")
        
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    if df['date'].isna().any():
        raise ValueError("Marketing data contains invalid dates")
        
    df['channel'] = df['channel'].str.upper().str.strip()
    df['region'] = df['region'].str.title().str.strip()
    
    numeric_cols = ['marketing_spend_inr', 'impressions', 'clicks', 'conversions', 
                    'attributed_quantity_kg', 'attributed_revenue_inr']
    for c in numeric_cols:
        if (df[c] < 0).any():
            raise ValueError(f"Marketing data contains negative value in {c}")
            
    df.sort_values(by='date', inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    return df

def load_b2b_accounts(filepath: Optional[str] = None) -> pd.DataFrame:
    if filepath is None:
        filepath = _get_data_path('b2b_accounts.csv')
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"B2B accounts file not found at {filepath}")
        
    df = pd.read_csv(filepath)
    req_cols = ['customer_id', 'customer_name', 'region', 'monthly_commitment_kg', 
                'unit_price_inr', 'minimum_fulfillment_pct', 'priority', 
                'contract_start', 'contract_end']
                
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        raise ValueError(f"B2B accounts data missing required columns: {missing}")
        
    df['region'] = df['region'].str.title().str.strip()
    df['priority'] = df['priority'].str.upper().str.strip()
    
    if not df['priority'].isin(['HIGH', 'MEDIUM', 'LOW']).all():
        raise ValueError("B2B priority must be HIGH, MEDIUM, or LOW")
        
    if (df['monthly_commitment_kg'] < 0).any() or (df['unit_price_inr'] < 0).any():
        raise ValueError("B2B accounts contains negative commitment or price")
        
    df['contract_start'] = pd.to_datetime(df['contract_start'], errors='coerce')
    df['contract_end'] = pd.to_datetime(df['contract_end'], errors='coerce')
    
    if df['contract_start'].isna().any() or df['contract_end'].isna().any():
        raise ValueError("B2B accounts contains invalid dates")
        
    return df
