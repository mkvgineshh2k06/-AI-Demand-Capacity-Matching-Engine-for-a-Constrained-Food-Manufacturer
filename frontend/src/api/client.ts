import {
  ForecastResponse, CapacityResponse, OptimizationResponse,
  ScenarioResponse, B2BEvaluationResponse, MarketingResponse,
  OperationalPlan, OptimizationStrategy, RiskMode, B2BAccount, ScenarioChanges
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errMessage = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // use status text
      }
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`Fetch error at ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Check backend health
  async checkHealth(): Promise<boolean> {
    // Try direct backend first (fastest, bypasses proxy), then proxy fallback
    const urls = [
      'http://127.0.0.1:8000/health',
      'http://localhost:8000/health',
      '/api/health',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'ok') return true;
        }
      } catch {
        // try next
      }
    }
    return false;
  },

  // Main operational plan loader
  async getOperationalPlan(params: {
    target_period: string;
    strategy?: OptimizationStrategy;
    risk_mode?: RiskMode;
    scenario?: ScenarioChanges;
    orders?: any[];
    capacity?: any[];
    marketing?: any[];
    b2b_accounts?: any[];
  }): Promise<OperationalPlan> {
    return fetchJson<OperationalPlan>('/plan', {
      method: 'POST',
      body: JSON.stringify({
        target_period: params.target_period,
        strategy: params.strategy || 'balanced',
        risk_mode: params.risk_mode || 'balanced',
        scenario: params.scenario || null,
        orders: params.orders || [],
        capacity: params.capacity || [],
        marketing: params.marketing || [],
        b2b_accounts: params.b2b_accounts || [],
      }),
    });
  },

  // Forecast demand
  async getForecast(orders: any[] = [], marketing: any[] = []): Promise<ForecastResponse> {
    return fetchJson<ForecastResponse>('/forecast', {
      method: 'POST',
      body: JSON.stringify({ orders, marketing }),
    });
  },

  // Evaluate capacity vs forecast
  async evaluateCapacity(forecast_result: any, capacity_record: any): Promise<CapacityResponse> {
    return fetchJson<CapacityResponse>('/capacity/evaluate', {
      method: 'POST',
      body: JSON.stringify({ forecast_result, capacity_record }),
    });
  },

  // Optimize allocation
  async optimizeCapacity(strategy: OptimizationStrategy, available_capacity_kg: number, segments: any[]): Promise<OptimizationResponse> {
    return fetchJson<OptimizationResponse>('/optimize', {
      method: 'POST',
      body: JSON.stringify({ strategy, available_capacity_kg, segments }),
    });
  },

  // Run what-if scenario simulation
  async runScenario(
    baseline_forecast: any,
    baseline_capacity: any,
    segments: any[],
    scenario_changes: ScenarioChanges,
    strategy: OptimizationStrategy = 'balanced'
  ): Promise<ScenarioResponse> {
    return fetchJson<ScenarioResponse>('/scenario', {
      method: 'POST',
      body: JSON.stringify({ baseline_forecast, baseline_capacity, segments, scenario_changes, strategy }),
    });
  },

  // Evaluate new B2B customer onboarding
  async evaluateB2BAccount(
    new_account: B2BAccount,
    available_capacity_kg: number,
    segments: any[],
    strategy: OptimizationStrategy = 'balanced'
  ): Promise<B2BEvaluationResponse> {
    return fetchJson<B2BEvaluationResponse>('/b2b/evaluate', {
      method: 'POST',
      body: JSON.stringify({ new_account, available_capacity_kg, segments, strategy }),
    });
  },

  // Capacity-aware marketing budget recommendation
  async recommendMarketing(
    marketing_history: any[],
    forecast_result: any,
    allocation_result: any,
    total_budget_change_inr: number = 0
  ): Promise<MarketingResponse> {
    return fetchJson<MarketingResponse>('/marketing/recommend', {
      method: 'POST',
      body: JSON.stringify({ marketing_history, forecast_result, allocation_result, total_budget_change_inr }),
    });
  },

  // RAG Copilot Chat
  async chatWithCopilot(req: {
    message: string;
    session_id?: string;
    strategy?: string;
    risk_mode?: string;
    target_period?: string;
    current_scenario?: any;
  }) {
    return fetchJson<any>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // RAG Copilot Health
  async getCopilotHealth() {
    return fetchJson<any>('/copilot/health', { method: 'GET' });
  },

  // Re-ingest Knowledge Base
  async ingestCopilotKnowledge() {
    return fetchJson<any>('/copilot/ingest', { method: 'POST' });
  },
};

