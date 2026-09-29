import os
import uuid
import numpy as np
import pandas as pd
from datetime import timedelta, date

def generate_demo_data(output_dir: str, seed: int = 42) -> dict:
    np.random.seed(seed)
    os.makedirs(output_dir, exist_ok=True)
    
    # Configuration
    start_date = date(2025, 1, 1)
    end_date = date(2026, 6, 30)
    days = (end_date - start_date).days + 1
    date_range = [start_date + timedelta(days=i) for i in range(days)]
    months_range = pd.date_range(start_date, end_date, freq='MS').strftime('%Y-%m').tolist()
    
    regions = ['Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Panaji']
    channels = ['D2C', 'B2B']
    
    # ---------------------------------------------------------
    # 1. Generate B2B Accounts
    # ---------------------------------------------------------
    b2b_accounts = []
    num_b2b_accounts = 25
    priorities = ['HIGH', 'MEDIUM', 'LOW']
    
    for i in range(num_b2b_accounts):
        account_id = f"CUST_B2B_{i+1:03d}"
        region = np.random.choice(regions)
        commitment = float(np.random.randint(200, 2000))
        unit_price = float(np.random.uniform(200, 300))
        priority = np.random.choice(priorities, p=[0.2, 0.5, 0.3])
        fulfillment_pct = np.random.choice([0.8, 0.9, 1.0])
        
        b2b_accounts.append({
            'customer_id': account_id,
            'customer_name': f"B2B Partner {i+1}",
            'region': region,
            'monthly_commitment_kg': commitment,
            'unit_price_inr': round(unit_price, 2),
            'minimum_fulfillment_pct': fulfillment_pct,
            'priority': priority,
            'contract_start': start_date.strftime('%Y-%m-%d'),
            'contract_end': (end_date + timedelta(days=180)).strftime('%Y-%m-%d')
        })
    df_b2b = pd.DataFrame(b2b_accounts)
    
    # ---------------------------------------------------------
    # 2. Generate Marketing Data (mostly impacts D2C)
    # ---------------------------------------------------------
    marketing_data = []
    daily_marketing_spend_base = 5000
    
    for d in date_range:
        for region in regions:
            # D2C Marketing
            spend_d2c = max(0, np.random.normal(daily_marketing_spend_base, 1000))
            if np.random.random() < 0.05: # occasional spike
                spend_d2c *= 3
            
            impressions = int(spend_d2c * np.random.uniform(8, 12))
            clicks = int(impressions * np.random.uniform(0.02, 0.05))
            conversions = int(clicks * np.random.uniform(0.05, 0.15))
            
            # Diminishing returns representation: sqrt of spend for quantity
            attr_qty = float(np.sqrt(spend_d2c) * np.random.uniform(0.5, 1.0))
            attr_rev = attr_qty * np.random.uniform(400, 500)
            
            marketing_data.append({
                'date': d.strftime('%Y-%m-%d'),
                'region': region,
                'channel': 'D2C',
                'marketing_spend_inr': round(float(spend_d2c), 2),
                'impressions': impressions,
                'clicks': clicks,
                'conversions': conversions,
                'attributed_quantity_kg': round(attr_qty, 2),
                'attributed_revenue_inr': round(attr_rev, 2)
            })
            
            # B2B Marketing (minimal)
            spend_b2b = max(0, np.random.normal(500, 100))
            marketing_data.append({
                'date': d.strftime('%Y-%m-%d'),
                'region': region,
                'channel': 'B2B',
                'marketing_spend_inr': round(float(spend_b2b), 2),
                'impressions': int(spend_b2b * 5),
                'clicks': int(spend_b2b * 0.2),
                'conversions': int(spend_b2b * 0.01),
                'attributed_quantity_kg': 0.0,
                'attributed_revenue_inr': 0.0
            })
    df_marketing = pd.DataFrame(marketing_data)
    # create lookup for d2c marketing impact
    marketing_lookup = df_marketing[df_marketing['channel'] == 'D2C'].set_index(['date', 'region'])['attributed_quantity_kg'].to_dict()
    
    # ---------------------------------------------------------
    # 3. Generate Orders
    # ---------------------------------------------------------
    orders_data = []
    
    # Global trend: mild growth over 18 months, scale factor 1.0 to 1.3
    trend = np.linspace(1.0, 1.3, days)
    
    for i, d in enumerate(date_range):
        day_of_week = d.weekday() # 0-6
        month_of_year = d.month # 1-12
        
        # Weekend multiplier max on Sat/Sun
        weekend_mult = 1.3 if day_of_week >= 5 else 0.9
        
        # Seasonality: higher in Oct-Dec (festive)
        seasonal_mult = 1.4 if month_of_year in [10, 11, 12] else 1.0
        
        date_str = d.strftime('%Y-%m-%d')
        
        for region in regions:
            # -- D2C Orders --
            base_d2c = 20 * trend[i] * weekend_mult * seasonal_mult
            mkt_impact = marketing_lookup.get((date_str, region), 0.0)
            
            # Add mkt impact and noise
            daily_d2c_demand = max(0, base_d2c + mkt_impact * np.random.uniform(0.5, 1.5) + np.random.normal(0, 10))
            
            # Decompose daily D2C demand into small orders (mean 2kg)
            num_d2c_orders = int(max(1, daily_d2c_demand / 2.0))
            
            for _ in range(num_d2c_orders):
                qty = max(0.1, np.random.lognormal(mean=0.5, sigma=0.5))
                price = np.random.uniform(400, 550)
                discount = np.random.choice([0.0, 0.05, 0.1, 0.2], p=[0.7, 0.15, 0.1, 0.05])
                eff_price = price * (1 - discount)
                
                # Assume 95% full fulfillment for D2C typically
                fulfilled_qty = qty
                
                orders_data.append({
                    'date': date_str,
                    'order_id': f"ORD_{uuid.uuid4().hex[:8].upper()}",
                    'channel': 'D2C',
                    'region': region,
                    'customer_id': 'GUEST',
                    'quantity_kg': round(qty, 2),
                    'unit_price_inr': round(price, 2),
                    'discount_pct': round(discount, 2),
                    'revenue_inr': round(qty * eff_price, 2),
                    'fulfilled_quantity_kg': round(fulfilled_qty, 2)
                })
            
            # -- B2B Orders --
            # B2B orders happen less frequently, e.g. weekly or bi-weekly per customer
            region_customers = df_b2b[df_b2b['region'] == region]
            for _, cust in region_customers.iterrows():
                # Prob of order today ~ 1/7
                if np.random.random() < (1/7.0):
                    # Order ~ 25% of monthly commitment
                    base_qty = cust['monthly_commitment_kg'] / 4.0
                    qty = max(5.0, np.random.normal(base_qty, base_qty * 0.2)) # less volatile
                    
                    price = cust['unit_price_inr']
                    eff_price = price # No ad-hoc discounts for B2B
                    
                    orders_data.append({
                        'date': date_str,
                        'order_id': f"ORD_{uuid.uuid4().hex[:8].upper()}",
                        'channel': 'B2B',
                        'region': region,
                        'customer_id': cust['customer_id'],
                        'quantity_kg': round(qty, 2),
                        'unit_price_inr': round(price, 2),
                        'discount_pct': 0.0,
                        'revenue_inr': round(qty * eff_price, 2),
                        'fulfilled_quantity_kg': round(qty, 2)
                    })
    
    df_orders = pd.DataFrame(orders_data)
    
    # ---------------------------------------------------------
    # 4. Generate Capacity Data
    # ---------------------------------------------------------
    # We want some shortage, some excess. We aggregate demand to see what the baseline is.
    df_orders['date_dt'] = pd.to_datetime(df_orders['date'])
    df_orders['month_str'] = df_orders['date_dt'].dt.strftime('%Y-%m')
    
    monthly_demand = df_orders.groupby('month_str')['quantity_kg'].sum().reset_index()
    
    capacity_data = []
    shortage_months = 0
    cap_scenarios = ['surplus', 'balanced', 'shortage']
    
    for _, row in monthly_demand.iterrows():
        m_str = row['month_str']
        d_val = row['quantity_kg']
        
        scenario = cap_scenarios[np.random.randint(0, 3)]
        
        if scenario == 'surplus':
            internal = int(d_val * 1.5)
            co_man = 0
        elif scenario == 'balanced':
            internal = int(d_val * 1.05)
            co_man = int(d_val * 0.2) # Optional expansion available
        elif scenario == 'shortage':
            internal = int(d_val * 0.8) # 20% shortage
            co_man = 0 # No co_man available
            shortage_months += 1
            
        downtime = int(internal * np.random.uniform(0.01, 0.05))
        reserved = int(internal * 0.05)
        available = (internal + co_man) - downtime - reserved
        
        # If capacity shortage, retroactively adjust fulfilled quantities in orders (simulate past reality)
        if scenario == 'shortage' and available < d_val:
            mask = df_orders['month_str'] == m_str
            fulfill_ratio = max(0.5, available / d_val)
            df_orders.loc[mask, 'fulfilled_quantity_kg'] = round(df_orders.loc[mask, 'quantity_kg'] * fulfill_ratio, 2)
            df_orders.loc[mask, 'revenue_inr'] = round(df_orders.loc[mask, 'fulfilled_quantity_kg'] * df_orders.loc[mask, 'unit_price_inr'] * (1 - df_orders.loc[mask, 'discount_pct']), 2)
        
        capacity_data.append({
            'month': m_str,
            'internal_capacity_kg': float(internal),
            'co_manufacturing_capacity_kg': float(co_man),
            'downtime_kg': float(downtime),
            'reserved_capacity_kg': float(reserved),
            'available_capacity_kg': float(max(0, available))
        })
    df_capacity = pd.DataFrame(capacity_data)
    
    # Cleanup orders temporary columns
    df_orders.drop(columns=['date_dt', 'month_str'], inplace=True)
    
    # ---------------------------------------------------------
    # Save the data
    # ---------------------------------------------------------
    df_orders.to_csv(os.path.join(output_dir, 'orders.csv'), index=False)
    df_capacity.to_csv(os.path.join(output_dir, 'capacity.csv'), index=False)
    df_marketing.to_csv(os.path.join(output_dir, 'marketing.csv'), index=False)
    df_b2b.to_csv(os.path.join(output_dir, 'b2b_accounts.csv'), index=False)
    
    # ---------------------------------------------------------
    # Generate Summary
    # ---------------------------------------------------------
    summary = {
        'date_range': f"{start_date} to {end_date}",
        'total_orders': len(df_orders),
        'regions': regions,
        'd2c_b2b_split': df_orders['channel'].value_counts(normalize=True).to_dict(),
        'average_price_d2c_inr': round(df_orders[df_orders['channel']=='D2C']['unit_price_inr'].mean(), 2),
        'average_price_b2b_inr': round(df_orders[df_orders['channel']=='B2B']['unit_price_inr'].mean(), 2),
        'total_quantity_kg': round(df_orders['quantity_kg'].sum(), 2),
        'months_with_shortages': shortage_months
    }
    
    return summary

if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/demo"))
    print(f"Generating data in {out_dir}...")
    summ = generate_demo_data(out_dir)
    print("\n--- Data Generation Summary ---")
    for k, v in summ.items():
        print(f"{k}: {v}")
    print("-------------------------------")
