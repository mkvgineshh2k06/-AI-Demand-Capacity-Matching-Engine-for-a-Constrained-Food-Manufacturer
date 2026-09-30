// Exact TypeScript types matching FastAPI Pydantic models & operational plan contract

export type OptimizationStrategy = 'revenue' | 'fulfillment' | 'balanced';
export type RiskMode = 'aggressive' | 'balanced' | 'safe';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeasibilityCategory = 'FEASIBLE' | 'CONDITIONALLY_FEASIBLE' | 'NOT_FEASIBLE';

export interface OrderRecord {
  date: string;
  region: string;
  channel: string;
  customer_id?: string;
  revenue_inr: number;
  quantity_kg: number;
}

export interface CapacityRecord {
  date: string;
  internal_capacity_kg: number;
  co_manufacturing_capacity_kg?: number;
  downtime_kg?: number;
  reserved_capacity_kg?: number;
  available_capacity_kg?: number;
}

export interface MarketingRecord {
  region: string;
  channel: string;
  spend_inr: number;
  attributed_orders?: number;
  attributed_revenue_inr?: number;
}

export interface B2BAccount {
  customer_name: string;
  region: string;
  monthly_requirement_kg: number;
  unit_price_inr: number;
  variable_cost_inr?: number;
  minimum_fulfillment_pct?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  start_month?: string;
  contract_months?: number;
}

export interface SegmentDemand {
  segment_id: string;
  region: string;
  channel: string;
  customer_id?: string;
  forecast_demand_kg: number;
  d2c_demand_kg?: number;
  b2b_demand_kg?: number;
  unit_price_inr: number;
  variable_cost_inr?: number;
  priority?: string;
  minimum_commitment_kg?: number;
  lower_bound_kg?: number;
  upper_bound_kg?: number;
}

export interface SegmentAllocation {
  segment_id: string;
  region: string;
  channel: string;
  demand_kg: number;
  forecast_demand_kg?: number;
  allocated_kg: number;
  fulfillment_pct: number;
  unfulfilled_kg: number;
  revenue_inr: number;
  allocation_revenue_inr?: number;
  shortfall_kg?: number;
}

export interface ForecastResponse {
  total_demand_kg: number;
  d2c_demand_kg?: number;
  b2b_demand_kg?: number;
  segments: SegmentDemand[];
  metrics?: {
    mae?: number;
    rmse?: number;
    wape?: number;
  };
}

export interface CapacityResponse {
  total_usable_capacity_kg: number;
  total_forecast_demand_kg: number;
  shortage_kg: number;
  utilization_pct: number;
  internal_capacity_kg: number;
  co_manufacturing_capacity_kg: number;
  downtime_kg: number;
  reserved_capacity_kg: number;
  has_shortage: boolean;
  spare_capacity_kg: number;
}

export interface OptimizationResponse {
  strategy: OptimizationStrategy;
  available_capacity_kg: number;
  total_demand_kg: number;
  allocated_capacity_kg: number;
  unfulfilled_demand_kg: number;
  utilization_pct: number;
  overall_fulfillment_pct: number;
  b2b_fulfillment_pct: number;
  d2c_fulfillment_pct: number;
  total_revenue_inr: number;
  total_b2b_shortfall_kg: number;
  segments: SegmentAllocation[];
  explanations: string[];
}

export interface ScenarioChanges {
  additional_internal_capacity_kg?: number;
  additional_co_manufacturing_capacity_kg?: number;
  demand_growth_pct?: number;
  region_specific_demand_growth?: Record<string, number>;
  channel_specific_demand_growth?: Record<string, number>;
  marketing_spend_changes?: Record<string, number>;
  new_b2b_account?: B2BAccount;
  downtime_change_kg?: number;
  reserved_capacity_change_kg?: number;
}

export interface ScenarioResponse {
  baseline: {
    total_demand_kg: number;
    available_capacity_kg: number;
    shortage_kg: number;
    revenue_inr: number;
    fulfillment_pct: number;
  };
  scenario: {
    total_demand_kg: number;
    available_capacity_kg: number;
    shortage_kg: number;
    revenue_inr: number;
    fulfillment_pct: number;
  };
  delta: {
    demand_change_kg: number;
    capacity_change_kg: number;
    shortage_change_kg: number;
    revenue_change_inr: number;
    fulfillment_change_pct: number;
  };
  allocation_comparison: {
    baseline_allocation: OptimizationResponse;
    scenario_allocation: OptimizationResponse;
  };
}

export interface B2BEvaluationResponse {
  customer_name: string;
  feasibility: FeasibilityCategory;
  requested_quantity_kg: number;
  new_account_fulfillment_pct: number;
  existing_b2b_fulfillment_before_pct: number;
  existing_b2b_fulfillment_after_pct: number;
  revenue_impact_inr: number;
  capacity_deficit_kg: number;
  minimum_additional_capacity_required_kg: number;
  explanation: string;
}

export interface MarketingAction {
  region: string;
  channel: string;
  action: 'INCREASE' | 'HOLD' | 'REDUCE' | 'REALLOCATE_IN' | 'REALLOCATE_OUT';
  current_spend_inr: number;
  recommended_spend_inr: number;
  roas: number;
  demand_efficiency: number;
  fulfillment_pct: number;
  reason: string;
}

export interface MarketingResponse {
  summary: {
    total_spend_inr: number;
    total_recommended_spend_inr: number;
    constrained_campaigns_count: number;
  };
  recommendations: MarketingAction[];
}

export interface RiskBoundSegment {
  region: string;
  channel: string;
  point_forecast_kg: number;
  lower_bound_kg: number;
  upper_bound_kg: number;
  confidence_level: number;
}

export interface RecommendationAction {
  action_id: string;
  type: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  estimated_impact?: string;
  trigger_reason: string;
}

export interface OperationalPlan {
  target_period: string;
  strategy: OptimizationStrategy;
  risk_mode: RiskMode;
  summary: {
    forecast_demand_kg: number;
    d2c_demand_kg: number;
    b2b_demand_kg: number;
    usable_capacity_kg: number;
    shortage_kg: number;
    allocated_capacity_kg: number;
    unfulfilled_demand_kg: number;
    fulfillment_pct: number;
    b2b_fulfillment_pct: number;
    d2c_fulfillment_pct: number;
    utilization_pct: number;
    projected_revenue_inr: number;
    risk_level: RiskLevel;
  };
  capacity_breakdown: CapacityResponse;
  allocation_plan: OptimizationResponse;
  marketing_recommendations: MarketingResponse;
  recommendations: RecommendationAction[];
  risk_plan: {
    mode: RiskMode;
    forecast_segments: RiskBoundSegment[];
    risk_level: RiskLevel;
    capacity_risk: string;
  };
  scenario_active?: boolean;
}

export interface CopilotSource {
  source: string;
  page: number;
  section: string;
}

export interface CopilotChatRequest {
  message: string;
  session_id?: string;
  strategy?: string;
  risk_mode?: string;
  target_period?: string;
  current_scenario?: any;
}

export interface CopilotChatResponse {
  status: string;
  answer: string;
  intent: string;
  sources: CopilotSource[];
  operational_context_used: string[];
  confidence: string;
  warnings: string[];
  ollama_used: boolean;
}

export interface CopilotHealthResponse {
  ollama_running: boolean;
  configured_model: string;
  available_models: string[];
  vector_store_ready: boolean;
  indexed_documents: number;
  indexed_chunks: number;
  error?: string | null;
}

