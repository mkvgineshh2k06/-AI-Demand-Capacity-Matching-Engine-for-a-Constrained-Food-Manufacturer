import React, { useState } from 'react';
import { Sliders, Play, RotateCcw, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
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
    <div className="space-y-8 pb-12 font-sans max-w-7xl mx-auto">
      {/* Page Editorial Header */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
              03 / INTERACTIVE SCENARIO LAB
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight">
              Test what-if mutations.
            </h1>
            <p className="text-sm text-[#64645F] max-w-xl">
              Simulate strategic capacity expansions, demand surges, maintenance downtimes, and co-manufacturing activation in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Baseline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunScenario}
              isLoading={isRunning}
              icon={<Play className="w-3.5 h-3.5 text-white" />}
            >
              Run Simulation
            </Button>
          </div>
        </div>
      </div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Scenario Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="SCENARIO PARAMETERS"
            subtitle="Adjust operational levers to mutate baseline parameters"
          >
            <div className="space-y-6 pt-2 font-sans">
              {/* Co-Manufacturing Capacity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
                  <span className="uppercase tracking-wider text-[11px]">Co-Manufacturing Volume</span>
                  <span className="text-[#324C3A] font-mono font-bold">+{coMfgAdd} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={coMfgAdd}
                  onChange={(e) => setCoMfgAdd(Number(e.target.value))}
                  className="w-full accent-[#324C3A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#64645F] font-mono">
                  <span>0 kg</span>
                  <span>+1,000 kg</span>
                  <span>+2,000 kg</span>
                </div>
              </div>

              {/* Internal Capacity Addition */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
                  <span className="uppercase tracking-wider text-[11px]">Internal Plant Expansion</span>
                  <span className="text-[#324C3A] font-mono font-bold">+{internalCapAdd} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={internalCapAdd}
                  onChange={(e) => setInternalCapAdd(Number(e.target.value))}
                  className="w-full accent-[#324C3A] cursor-pointer"
                />
              </div>

              {/* Demand Growth % */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
                  <span className="uppercase tracking-wider text-[11px]">Market Demand Shift (%)</span>
                  <span className={demandGrowthPct >= 0 ? 'text-[#324C3A] font-mono font-bold' : 'text-[#9E3B3B] font-mono font-bold'}>
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
                  className="w-full accent-[#324C3A] cursor-pointer"
                />
              </div>

              {/* Downtime Change */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
                  <span className="uppercase tracking-wider text-[11px]">Maintenance Downtime (+/- kg)</span>
                  <span className={downtimeChange <= 0 ? 'text-[#324C3A] font-mono font-bold' : 'text-[#9E3B3B] font-mono font-bold'}>
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
                  className="w-full accent-[#324C3A] cursor-pointer"
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
                  icon={<Zap className="w-4 h-4 text-white" />}
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
            title="OPERATIONAL DELTA IMPACT"
            subtitle="Comparison of baseline operational parameters against scenario predictions"
            action={
              scenarioResult && (
                <Badge variant="teal" size="sm">
                  SIMULATION ACTIVE
                </Badge>
              )
            }
          >
            {scenarioResult ? (
              <div className="space-y-6 pt-2 font-sans">
                {/* 3 Metric Comparison Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Capacity */}
                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#64645F] uppercase tracking-wider">Usable Capacity</span>
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-[#64645F]">{scenarioResult.baseline.available_capacity_kg.toLocaleString()} kg</span>
                      <ArrowRight className="w-3 h-3 text-[#64645F]" />
                      <span className="text-[#324C3A] font-bold">{scenarioResult.scenario.available_capacity_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-[#324C3A] pt-1">
                      Delta: +{scenarioResult.delta.capacity_change_kg.toLocaleString()} kg
                    </div>
                  </div>

                  {/* Shortage */}
                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#64645F] uppercase tracking-wider">Shortage Deficit</span>
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-[#64645F]">{scenarioResult.baseline.shortage_kg.toLocaleString()} kg</span>
                      <ArrowRight className="w-3 h-3 text-[#64645F]" />
                      <span className="text-[#9E3B3B] font-bold">{scenarioResult.scenario.shortage_kg.toLocaleString()} kg</span>
                    </div>
                    <div className={`text-[10px] font-mono font-bold pt-1 ${scenarioResult.delta.shortage_change_kg <= 0 ? 'text-[#324C3A]' : 'text-[#9E3B3B]'}`}>
                      Delta: {scenarioResult.delta.shortage_change_kg <= 0 ? `${scenarioResult.delta.shortage_change_kg.toLocaleString()} kg` : `+${scenarioResult.delta.shortage_change_kg.toLocaleString()} kg`}
                    </div>
                  </div>

                  {/* Fulfillment */}
                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#64645F] uppercase tracking-wider">Fulfillment Rate</span>
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-[#64645F]">{scenarioResult.baseline.fulfillment_pct.toFixed(1)}%</span>
                      <ArrowRight className="w-3 h-3 text-[#64645F]" />
                      <span className="text-[#324C3A] font-bold">{scenarioResult.scenario.fulfillment_pct.toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-[#324C3A] pt-1">
                      Delta: {scenarioResult.delta.fulfillment_change_pct >= 0 ? `+${scenarioResult.delta.fulfillment_change_pct.toFixed(1)}%` : `${scenarioResult.delta.fulfillment_change_pct.toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                {/* Scenario Impact Narrative */}
                <div className="p-5 bg-[#324C3A] text-white rounded-[2px] space-y-2">
                  <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-white" /> Scenario Impact Summary
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed">
                    By adding <strong className="text-white font-mono">+{coMfgAdd} kg</strong> co-manufacturing capacity, overall demand fulfillment increases to{' '}
                    <strong className="text-white font-mono">{scenarioResult.scenario.fulfillment_pct.toFixed(1)}%</strong>. Projected shortage drops from{' '}
                    <span className="line-through opacity-70 font-mono">{scenarioResult.baseline.shortage_kg} kg</span> to{' '}
                    <strong className="text-white font-mono">{scenarioResult.scenario.shortage_kg} kg</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 font-sans">
                <Sliders className="w-8 h-8 text-[#DEDED8] mx-auto" />
                <div className="text-sm font-bold text-[#111111] uppercase tracking-wider">No Active Simulation</div>
                <p className="text-xs text-[#64645F] max-w-sm mx-auto">
                  Adjust parameter sliders on the left and click <strong>Run Simulation</strong> to simulate operational impact.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

