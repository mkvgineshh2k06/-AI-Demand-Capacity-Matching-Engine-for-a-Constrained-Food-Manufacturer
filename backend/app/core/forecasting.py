import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
from app.core.preprocessing import prepare_forecasting_dataset, get_latest_segment_state

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/saved_models"))

def calculate_wape(y_true, y_pred):
    """
    Weighted Absolute Percentage Error (WAPE).
    Formula: SUM(|y_true - y_pred|) / SUM(y_true)
    Returns value as a percentage or ratio. We will return as ratio (e.g. 0.15 = 15%).
    """
    sum_abs_error = np.sum(np.abs(y_true - y_pred))
    sum_true = np.sum(y_true)
    if sum_true == 0:
        return 0.0 if sum_abs_error == 0 else np.nan
    return sum_abs_error / sum_true

def evaluate_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    wape = calculate_wape(y_true, y_pred)
    return {"mae": float(mae), "rmse": float(rmse), "wape": float(wape)}


class DemandForecaster:
    def __init__(self):
        self.model = None
        self.encoder = None
        self.features = [
            'lag_1', 'lag_2', 'lag_4', 'rolling_mean_4', 'rolling_mean_8', 'rolling_std_4',
            'month', 'week_of_year', 'trend_index', 'avg_selling_price',
            'marketing_spend', 'lagged_marketing_spend', 'region_encoded', 'channel_encoded'
        ]
        
    def _encode_data(self, df, fit=False):
        df_enc = df.copy()
        if fit:
            self.encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
            df_enc[['region_encoded', 'channel_encoded']] = self.encoder.fit_transform(df_enc[['region', 'channel']])
        else:
            if self.encoder:
                df_enc[['region_encoded', 'channel_encoded']] = self.encoder.transform(df_enc[['region', 'channel']])
            else:
                df_enc[['region_encoded', 'channel_encoded']] = 0
        return df_enc
        
    def _prepare_and_clean(self, df):
        df = df.dropna(subset=['target_quantity_kg', 'lag_1']).copy()
        df.fillna(0, inplace=True)
        return df

    def train(self, df: pd.DataFrame):
        # 1. Clean and Encode
        df_clean = self._prepare_and_clean(df)
        df_enc = self._encode_data(df_clean, fit=True)
        
        # 2. Chronological Split (e.g., last 4 weeks as validation)
        periods = sorted(df_enc['period'].unique())
        if len(periods) <= 4:
            raise ValueError("Dataset is too short for a 4-week validation split.")
            
        val_periods = periods[-4:]
        train_df = df_enc[~df_enc['period'].isin(val_periods)]
        val_df = df_enc[df_enc['period'].isin(val_periods)]
        
        X_train, y_train = train_df[self.features], train_df['target_quantity_kg']
        X_val, y_val = val_df[self.features], val_df['target_quantity_kg']
        
        # 3. Model 1: Naive Baseline (lag_1 or rolling_mean_4)
        # Using rolling_mean_4 as a stronger naive baseline
        naive_preds = np.maximum(0, val_df['rolling_mean_4'].values)
        naive_metrics = evaluate_metrics(y_val, naive_preds)
        
        # 4. Model 2: ML Model
        ml_model = HistGradientBoostingRegressor(random_state=42, max_iter=200, min_samples_leaf=5)
        ml_model.fit(X_train, y_train)
        
        ml_preds = np.maximum(0, ml_model.predict(X_val))
        ml_metrics = evaluate_metrics(y_val, ml_preds)
        
        # 5. Model Selection (Prefer ML unless Naive WAPE is significantly better - rare but possible if ML overfits wildly, 
        # though WAPE lower is better)
        if (not np.isnan(naive_metrics["wape"])) and (naive_metrics["wape"] < ml_metrics["wape"]):
            self.model = "NAIVE"
            metrics = naive_metrics
            self.model_name = "Naive Baseline (Rolling Mean 4)"
        else:
            self.model = ml_model
            metrics = ml_metrics
            self.model_name = "HistGradientBoostingRegressor"
            
        return metrics

    def save_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        path = os.path.join(MODEL_DIR, "forecaster.joblib")
        joblib.dump({
            'model': self.model,
            'encoder': self.encoder,
            'model_name': self.model_name
        }, path)
        return path

    def load_model(self):
        path = os.path.join(MODEL_DIR, "forecaster.joblib")
        if not os.path.exists(path):
            raise FileNotFoundError("Model not found. Train first.")
        data = joblib.load(path)
        self.model = data['model']
        self.encoder = data['encoder']
        self.model_name = data['model_name']


def forecast_next_period(orders_df: pd.DataFrame, marketing_df: pd.DataFrame, horizon_weeks=4, future_marketing_plan=None):
    """
    Forecasting entrypoint. Predicts future demand auto-regressively over `horizon_weeks`.
    """
    df = prepare_forecasting_dataset(orders_df, marketing_df, frequency="W")
    
    # Initialize and Train Forecaster if necessary
    forecaster = DemandForecaster()
    try:
        forecaster.load_model()
        # Evaluate metrics on latest data (or just use loaded if we had them saved, but for hackathon, 
        # inline train ensures it runs on generated demo perfectly).
        metrics = forecaster.train(df) # Retrain on latest! 
    except FileNotFoundError:
        metrics = forecaster.train(df)
        forecaster.save_model()
        
    latest_state_df = get_latest_segment_state(df)
    
    # Fill missing future marketing conservatively (use segment avg)
    if future_marketing_plan is None:
        avg_mkt = df.groupby(['region', 'channel'])['marketing_spend'].mean().reset_index()
        avg_mkt = avg_mkt.rename(columns={'marketing_spend': 'future_mkt_spend'})
        latest_state_df = latest_state_df.merge(avg_mkt, on=['region', 'channel'], how='left')
    else:
        raise NotImplementedError("Future marketing plan injection not fully stubbed out yet.")
        
    forecasts = []
    
    # Auto-regressive loop
    current_state = latest_state_df.copy()
    
    # Safety fill NaNs for the starting state
    current_state.fillna(0, inplace=True)
    
    for step in range(horizon_weeks):
        # Prepare predicting inputs
        current_state['marketing_spend'] = current_state.get('future_mkt_spend', 0.0)
        current_state = forecaster._encode_data(current_state, fit=False)
        
        X = current_state[forecaster.features].fillna(0)
        
        # Predict
        if forecaster.model == "NAIVE":
            preds = np.maximum(0, current_state['rolling_mean_4'].values)
        else:
            preds = np.maximum(0, forecaster.model.predict(X))
            
        # Store predictions
        for i, row in current_state.iterrows():
            forecasts.append({
                'region': row['region'],
                'channel': row['channel'],
                'week_offset': step + 1,
                'forecast_quantity_kg': preds[i]
            })
            
        # Update Auto-Regressive State (Shift everything 1 step ahead conceptually)
        # target_quantity_kg becomes the lag1. 
        # Note: rolling_mean_4 conceptually changes, but exact update logic without full history is complex.
        # Approximation for Hackathon: 
        # new_rolling_4 = (rolling_mean_4 * 3 + lag_1) / 4 etc.
        current_state['lag_4'] = current_state['lag_2'] # Rough heuristic shift 
        current_state['lag_2'] = current_state['lag_1']
        current_state['lag_1'] = preds
        
        # Approximate Rolling Window
        current_state['rolling_mean_4'] = (current_state['rolling_mean_4'] * 3 + preds) / 4.0
        current_state['rolling_mean_8'] = (current_state['rolling_mean_8'] * 7 + preds) / 8.0
        current_state['lagged_marketing_spend'] = current_state['marketing_spend']
        current_state['trend_index'] += 1
        current_state['week_of_year'] = (current_state['week_of_year'] % 52) + 1
        # average selling price stays constant in this naive projection
        
    # Aggregate Outputs
    forecasts_df = pd.DataFrame(forecasts)
    
    # Aggregate by segment for output
    segment_totals = forecasts_df.groupby(['region', 'channel'])['forecast_quantity_kg'].sum().reset_index()
    
    overall_total = segment_totals['forecast_quantity_kg'].sum()
    d2c_total = segment_totals[segment_totals['channel'] == 'D2C']['forecast_quantity_kg'].sum()
    b2b_total = segment_totals[segment_totals['channel'] == 'B2B']['forecast_quantity_kg'].sum()
    
    output = {
        "horizon_weeks": horizon_weeks,
        "model_name": forecaster.model_name,
        "metrics": metrics,
        "segments": [
            {
                "region": float(row['region']) if isinstance(row['region'], (int, float)) else row['region'],
                "channel": row['channel'],
                "forecast_quantity_kg": round(float(row['forecast_quantity_kg']), 2)
            } for i, row in segment_totals.iterrows()
        ],
        "d2c_demand_kg": round(float(d2c_total), 2),
        "b2b_demand_kg": round(float(b2b_total), 2),
        "total_demand_kg": round(float(overall_total), 2)
    }
    return output
