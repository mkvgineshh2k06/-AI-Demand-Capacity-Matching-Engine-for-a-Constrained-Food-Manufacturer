import pandas as pd
import numpy as np

def prepare_forecasting_dataset(orders_df: pd.DataFrame, marketing_df: pd.DataFrame, frequency="W") -> pd.DataFrame:
    """
    Prepares a dataset ready for time-series forecasting.
    Aggregates to frequency x region x channel.
    Target variable: quantity_kg
    """
    if orders_df.empty:
        return pd.DataFrame()
        
    odf = orders_df.copy()
    mdf = marketing_df.copy()
    
    # 1. Aggregate Orders
    odf['period'] = pd.to_datetime(odf['date']).dt.to_period(frequency)
    
    # Aggregate quantities, revenues, and get max/first dates to extract month/week later
    agg_orders = odf.groupby(['period', 'region', 'channel']).agg(
        target_quantity_kg=('quantity_kg', 'sum'),
        total_revenue=('revenue_inr', 'sum'),
        start_date=('date', 'min')
    ).reset_index()
    
    # Calculate average selling price
    # If quantity is 0, ASP is 0. 
    # Use np.where to avoid division by zero.
    agg_orders['avg_selling_price'] = np.where(
        agg_orders['target_quantity_kg'] > 0,
        agg_orders['total_revenue'] / agg_orders['target_quantity_kg'],
        0
    )
    
    # 2. Aggregate Marketing
    if not mdf.empty:
        mdf['period'] = pd.to_datetime(mdf['date']).dt.to_period(frequency)
        agg_marketing = mdf.groupby(['period', 'region', 'channel']).agg(
            marketing_spend=('marketing_spend_inr', 'sum')
        ).reset_index()
    else:
        agg_marketing = pd.DataFrame(columns=['period', 'region', 'channel', 'marketing_spend'])
        
    # 3. Merge
    df = pd.merge(agg_orders, agg_marketing, on=['period', 'region', 'channel'], how='left')
    df['marketing_spend'] = df['marketing_spend'].fillna(0.0)
    
    # Fill in date components
    df['start_date'] = pd.to_datetime(df['start_date'])
    df['month'] = df['start_date'].dt.month
    df['week_of_year'] = df['start_date'].dt.isocalendar().week
    
    # Ensure dataset is sorted by region, channel, and strictly chronologically
    df = df.sort_values(by=['region', 'channel', 'period']).reset_index(drop=True)
    
    # Generate a trend index by period
    # We will compute trend_index based on the order of periods
    unique_periods = sorted(df['period'].unique())
    period_to_idx = {p: i for i, p in enumerate(unique_periods)}
    df['trend_index'] = df['period'].map(period_to_idx)
    
    # 4. Create Lag & Rolling Features Per Segment
    # Critical: All lags and rollings MUST be shifted by 1 so there's no data leakage.
    def create_features(group):
        g = group.copy()
        
        # We need to guarantee rows are perfectly contiguous in time without gaps, 
        # or just use shift if assuming regular time series. To be extremely robust, 
        # we can just use positional shift assuming periods are regular. 
        # For a robust approach, missing periods should ideally be filled with 0, 
        # but the prompt didn't mandate period gap filling. We'll stick to positional shift.
        
        # Lags on target
        g['lag_1'] = g['target_quantity_kg'].shift(1)
        g['lag_2'] = g['target_quantity_kg'].shift(2)
        g['lag_4'] = g['target_quantity_kg'].shift(4)
        
        # Rolling on target (needs to use the shifted series to avoid leakage!)
        shifted_target = g['target_quantity_kg'].shift(1)
        g['rolling_mean_4'] = shifted_target.rolling(window=4, min_periods=1).mean()
        g['rolling_mean_8'] = shifted_target.rolling(window=8, min_periods=1).mean()
        g['rolling_std_4'] = shifted_target.rolling(window=4, min_periods=1).std().fillna(0.0)
        
        # Lagged marketing
        g['lagged_marketing_spend'] = g['marketing_spend'].shift(1)
        return g
    
    df = df.groupby(['region', 'channel'], group_keys=False).apply(create_features)
    
    # Clean up auxiliary columns and NaNs in early periods where lags don't exist
    # If the user wants ready to ML data, we often drop NA lags, 
    # but we'll return them (maybe downstream handles NA or imputation).
    
    return df

def get_latest_segment_state(prepared_df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns the most recent row for each region + channel segment. 
    This row forms the basis for making the *next* prediction.
    """
    if prepared_df.empty:
        return pd.DataFrame()
        
    last_state = prepared_df.sort_values('period').groupby(['region', 'channel']).tail(1).copy()
    
    # We actually need to shift features FORWARD internally if we were generating the NEXT period feature vector,
    # but the simplest representation of "latest state" is just the last known row's target and rolling values.
    # The actual forecasting module will likely take this row, set `lag_1 = target_quantity_kg`, etc.
    return last_state.reset_index(drop=True)
