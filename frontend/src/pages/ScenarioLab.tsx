import React, { useState } from 'react';
import { Sliders, Play, RotateCcw, ArrowRight, TrendingUp, HardDrive, AlertTriangle, DollarSign, CheckCircle2, Zap } from 'lucide-react';
import { OperationalPlan, ScenarioResponse, ScenarioChanges } from '../api/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';

interface ScenarioLabProps {
  plan: OperationalPlan;
  onApplyScenario: (changes: ScenarioChanges, response: ScenarioResponse) => void;
  onResetScenario: () => void;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({
  plan,
  onApplyScenario,
  onResetScenario,
}) => {
  const { summary } = plan;

  // Form state for scenario controls
  const [coMfgAdd, setCoMfgAdd] = useState<number>(500);
  const [internalCapAdd, setInternalCapAdd] = useState<number>(0);
  const [demandGrowthPct, setDemandGrowthPct] = useState<number>(0);
  const [downtimeChange, setDowntimeChange] = useState<number>(0);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResponse | null>(null);

  const handleRunScenario = async () => {
    setIsRunning(true);

    const changes: ScenarioChanges = {
      additional_co_manufacturing_capacity_kg: coMfgAdd,
      additional_internal_capacity_kg: internalCapAdd,
      demand_growth_pct: demandGrowthPct,
      downtime_change_kg: downtimeChange,
    };

    const baseline_forecast = {
      total_demand_kg: summary.forecast_demand_kg,
      segments: plan.allocation_plan.segments || [],
    };
    const baseline_capacity = {
      available_capacity_kg: summary.usable_capacity_kg,
    };

    try {
      const res = await api.runScenario(
        baseline_forecast,
        baseline_capacity,
        plan.allocation_plan.segments || [],
        changes,
        plan.strategy
      );
      setScenarioResult(res);
      onApplyScenario(changes, res);
    } catch {
      // Fallback local simulation if backend offline
      const newCap = summary.usable_capacity_kg + coMfgAdd + internalCapAdd - downtimeChange;
      const newDem = summary.forecast_demand_kg * (1 + demandGrowthPct / 100);
      const newShort = Math.max(0, newDem - newCap);
      const newFul = Math.min(100, (Math.min(newDem, newCap) / newDem) * 100);
      const newRev = Math.min(newDem, newCap) * 380;

      const fallbackRes: ScenarioResponse = {
        baseline: {
          total_demand_kg: summary.forecast_demand_kg,
          available_capacity_kg: summary.usable_capacity_kg,
          shortage_kg: summary.shortage_kg,
          revenue_inr: summary.projected_revenue_inr,
          fulfillment_pct: summary.fulfillment_pct,
        },
        scenario: {
          total_demand_kg: newDem,
          available_capacity_kg: newCap,
          shortage_kg: newShort,
          revenue_inr: newRev,
          fulfillment_pct: newFul,
        },
        delta: {
          demand_change_kg: newDem - summary.forecast_demand_kg,
          capacity_change_kg: newCap - summary.usable_capacity_kg,
          shortage_change_kg: newShort - summary.shortage_kg,
          revenue_change_inr: newRev - summary.projected_revenue_inr,
          fulfillment_change_pct: newFul - summary.fulfillment_pct,
        },
        allocation_comparison: {
          baseline_allocation: plan.allocation_plan,
          scenario_allocation: {
            ...plan.allocation_plan,
            available_capacity_kg: newCap,
            allocated_capacity_kg: Math.min(newDem, newCap),
            unfulfilled_demand_kg: newShort,
            overall_fulfillment_pct: newFul,
            total_revenue_inr: newRev,
          },
        },
      };

      setScenarioResult(fallbackRes);
      onApplyScenario(changes, fallbackRes);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCoMfgAdd(0);
    setInternalCapAdd(0);
    setDemandGrowthPct(0);
    setDowntimeChange(0);
    setScenarioResult(null);
    onResetScenario();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-700" />
            Interactive What-If Scenario Lab
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test strategic capacity additions, demand shocks, and co-manufacturing before operational deployment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset to Baseline
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunScenario}
            isLoading={isRunning}
            icon={<Play className="w-3.5 h-3.5 text-teal-200 fill-teal-200" />}
          >
            Run Scenario Simulation
          </Button>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Scenario Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Scenario Parameters & Drivers"
            subtitle="Adjust operational levers to mutate baseline forecast and capacity"
          >
            <div className="space-y-5 pt-1">
              {/* Co-Manufacturing Capacity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>Additional Co-Manufacturing Capacity</span>
                  <span className="text-teal-700 font-bold">+{coMfgAdd} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={coMfgAdd}
                  onChange={(e) => setCoMfgAdd(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 kg</span>
                  <span>+1,000 kg</span>
                  <span>+2,000 kg</span>
                </div>
              </div>

              {/* Internal Capacity Addition */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>Internal Plant Expansion</span>
                  <span className="text-teal-700 font-bold">+{internalCapAdd} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={internalCapAdd}
                  onChange={(e) => setInternalCapAdd(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Demand Growth % */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>Market Demand Shift (%)</span>
                  <span className={demandGrowthPct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {demandGrowthPct > 0 ? `+${demandGrowthPct}%` : `${demandGrowthPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="5"
                  value={demandGrowthPct}
                  onChange={(e) => setDemandGrowthPct(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Downtime Change */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>Maintenance Downtime (+/- kg)</span>
                  <span className={downtimeChange <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {downtimeChange > 0 ? `+${downtimeChange} kg` : `${downtimeChange} kg`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="500"
                  step="25"
                  value={downtimeChange}
                  onChange={(e) => setDowntimeChange(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleRunScenario}
                  isLoading={isRunning}
                  icon={<Zap className="w-4 h-4 text-teal-200 fill-teal-200" />}
                >
                  Recalculate Optimizer Plan
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Before vs After Delta Comparison */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Live Before vs After Operational Impact"
            subtitle="Comparing baseline baseline metrics against calculated scenario outcome"
            action={
              scenarioResult && (
                <Badge variant="teal" size="sm">
                  SIMULATION ACTIVE
                </Badge>
              )
            }
          >
            {scenarioResult ? (
              <div className="space-y-4 pt-1">
                {/* 4 Primary Metric Comparison Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Capacity */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usable Capacity</span>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400 font-medium">{scenarioResult.baseline.available_capacity_kg.toLocaleString()} kg</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-teal-700 font-bold">{scenarioResult.scenario.available_capacity_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 pt-0.5">
                      Delta: +{scenarioResult.delta.capacity_change_kg.toLocaleString()} kg
                    </div>
                  </div>

                  {/* Shortage */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Shortage Deficit</span>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400 font-medium">{scenarioResult.baseline.shortage_kg.toLocaleString()} kg</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-rose-600 font-bold">{scenarioResult.scenario.shortage_kg.toLocaleString()} kg</span>
                    </div>
                    <div className={`text-[11px] font-semibold pt-0.5 ${scenarioResult.delta.shortage_change_kg <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Delta: {scenarioResult.delta.shortage_change_kg <= 0 ? `${scenarioResult.delta.shortage_change_kg.toLocaleString()} kg` : `+${scenarioResult.delta.shortage_change_kg.toLocaleString()} kg`}
                    </div>
                  </div>

                  {/* Fulfillment */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fulfillment Rate</span>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400 font-medium">{scenarioResult.baseline.fulfillment_pct.toFixed(1)}%</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-teal-700 font-bold">{scenarioResult.scenario.fulfillment_pct.toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 pt-0.5">
                      Delta: {scenarioResult.delta.fulfillment_change_pct >= 0 ? `+${scenarioResult.delta.fulfillment_change_pct.toFixed(1)}%` : `${scenarioResult.delta.fulfillment_change_pct.toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                {/* Scenario Impact Narrative */}
                <div className="p-4 bg-teal-900 text-white rounded-xl space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-300" /> Scenario Impact Summary
                  </h4>
                  <p className="text-xs text-teal-100/90 leading-relaxed">
                    By adding <strong className="text-white">+{coMfgAdd} kg</strong> co-manufacturing capacity, overall demand fulfillment increases to{' '}
                    <strong className="text-white">{scenarioResult.scenario.fulfillment_pct.toFixed(1)}%</strong>. Projected capacity shortage drops from{' '}
                    <span className="line-through opacity-80">{scenarioResult.baseline.shortage_kg} kg</span> to{' '}
                    <strong className="text-teal-200">{scenarioResult.scenario.shortage_kg} kg</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">No Scenario Running</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Adjust the parameters on the left and click <strong>Run Scenario Simulation</strong> to test what-if operational mutations.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
