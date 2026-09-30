import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, ScreenId } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { FinancialTicker } from './components/layout/FinancialTicker';
import { Overview } from './pages/Overview';
import { Forecast } from './pages/Forecast';
import { Allocation } from './pages/Allocation';
import { ScenarioLab } from './pages/ScenarioLab';
import { B2BEvaluator } from './pages/B2BEvaluator';
import { Marketing } from './pages/Marketing';
import { RiskPlanner } from './pages/RiskPlanner';
import { Copilot } from './pages/Copilot';
import { ActionPlan } from './pages/ActionPlan';
import { OperationalPlan, OptimizationStrategy, RiskMode, ScenarioChanges, ScenarioResponse, RecommendationAction } from './api/types';
import { api } from './api/client';
import { DEMO_OPERATIONAL_PLAN, DEMO_ORDERS, DEMO_CAPACITY, DEMO_MARKETING, DEMO_B2B_ACCOUNTS } from './utils/demoData';
import { Skeleton, CardSkeleton } from './components/ui/Skeleton';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('overview');
  const [targetPeriod, setTargetPeriod] = useState<string>('2024-05');
  const [strategy, setStrategy] = useState<OptimizationStrategy>('balanced');
  const [riskMode, setRiskMode] = useState<RiskMode>('balanced');
  const [activeScenario, setActiveScenario] = useState<ScenarioChanges | null>(null);

  const [plan, setPlan] = useState<OperationalPlan>(DEMO_OPERATIONAL_PLAN);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // --- Helper: generate reactive demo plan based on current controls ---
  const generateReactiveDemoPlan = (
    period: string,
    strat: OptimizationStrategy,
    risk: RiskMode
  ): OperationalPlan => {
    const base = DEMO_OPERATIONAL_PLAN;

    // Strategy modifies allocation behaviour
    const stratMultiplier =
      strat === 'revenue' ? { b2bFill: 0.98, d2cFill: 0.45, revenue: 1920000, fulfillment: 74.0 }
      : strat === 'fulfillment' ? { b2bFill: 0.88, d2cFill: 0.68, revenue: 1760000, fulfillment: 80.5 }
      : { b2bFill: 0.924, d2cFill: 0.526, revenue: 1845000, fulfillment: 76.5 };

    // Risk mode modifies capacity buffer and risk level
    const riskMeta =
      risk === 'safe'
        ? { risk_level: 'LOW' as const, capacity: 3750, shortage: 1410 }
        : risk === 'aggressive'
        ? { risk_level: 'CRITICAL' as const, capacity: 4100, shortage: 1060 }
        : { risk_level: 'HIGH' as const, capacity: 3950, shortage: 1210 };

    // Horizon changes demand figures
    const periodMap: Record<string, { demand: number; b2b: number; d2c: number; mult: number }> = {
      '2024-02': { demand: 4800, b2b: 2900, d2c: 1900, mult: 0.93 },
      '2024-05': { demand: 5160, b2b: 3100, d2c: 2060, mult: 1.00 },
      '2024-08': { demand: 5480, b2b: 3280, d2c: 2200, mult: 1.06 },
      '2024-11': { demand: 5820, b2b: 3490, d2c: 2330, mult: 1.13 },
    };
    const periodFigures = periodMap[period] ?? { demand: 5160, b2b: 3100, d2c: 2060, mult: 1.0 };
    const shortage = Math.max(0, periodFigures.demand - riskMeta.capacity);

    // Dynamic reactive segments generation across regions & channels
    const rawSegments = [
      { segment_id: 'MUM_B2B', region: 'Mumbai', channel: 'B2B', baseDemand: 800, price: 400, b2bPriority: true },
      { segment_id: 'MUM_D2C', region: 'Mumbai', channel: 'D2C', baseDemand: 600, price: 480, b2bPriority: false },
      { segment_id: 'PUN_B2B', region: 'Pune', channel: 'B2B', baseDemand: 550, price: 380, b2bPriority: true },
      { segment_id: 'PUN_D2C', region: 'Pune', channel: 'D2C', baseDemand: 350, price: 460, b2bPriority: false },
      { segment_id: 'DEL_B2B', region: 'Delhi', channel: 'B2B', baseDemand: 700, price: 410, b2bPriority: true },
      { segment_id: 'DEL_D2C', region: 'Delhi', channel: 'D2C', baseDemand: 420, price: 500, b2bPriority: false },
      { segment_id: 'BLR_B2B', region: 'Bengaluru', channel: 'B2B', baseDemand: 600, price: 415, b2bPriority: true },
      { segment_id: 'BLR_D2C', region: 'Bengaluru', channel: 'D2C', baseDemand: 390, price: 500, b2bPriority: false },
      { segment_id: 'CHE_B2B', region: 'Chennai', channel: 'B2B', baseDemand: 450, price: 400, b2bPriority: true },
      { segment_id: 'CHE_D2C', region: 'Chennai', channel: 'D2C', baseDemand: 300, price: 466, b2bPriority: false },
    ];

    const reactiveSegments = rawSegments.map((s) => {
      const dem = Math.round(s.baseDemand * periodFigures.mult);
      const fillRate = s.channel === 'B2B' ? stratMultiplier.b2bFill : stratMultiplier.d2cFill;
      const capFactor = riskMeta.capacity / 3950;
      const alloc = Math.min(dem, Math.round(dem * fillRate * capFactor));
      const unful = Math.max(0, dem - alloc);
      const pct = Math.round((alloc / (dem || 1)) * 1000) / 10;
      const rev = alloc * s.price;

      return {
        segment_id: s.segment_id,
        region: s.region,
        channel: s.channel,
        demand_kg: dem,
        forecast_demand_kg: dem,
        allocated_kg: alloc,
        fulfillment_pct: pct,
        unfulfilled_kg: unful,
        revenue_inr: rev,
        allocation_revenue_inr: rev,
      };
    });

    const totAllocated = reactiveSegments.reduce((acc, s) => acc + s.allocated_kg, 0);
    const totDemand = reactiveSegments.reduce((acc, s) => acc + s.demand_kg, 0);
    const totRevenue = reactiveSegments.reduce((acc, s) => acc + s.revenue_inr, 0);
    const calculatedShortage = Math.max(0, totDemand - totAllocated);

    const b2bDem = reactiveSegments.filter(s => s.channel === 'B2B').reduce((a, b) => a + b.demand_kg, 0);
    const b2bAlloc = reactiveSegments.filter(s => s.channel === 'B2B').reduce((a, b) => a + b.allocated_kg, 0);
    const d2cDem = reactiveSegments.filter(s => s.channel === 'D2C').reduce((a, b) => a + b.demand_kg, 0);
    const d2cAlloc = reactiveSegments.filter(s => s.channel === 'D2C').reduce((a, b) => a + b.allocated_kg, 0);

    const dynamicRecs: RecommendationAction[] = [];
    if (strat === 'revenue') {
      dynamicRecs.push({
        action_id: 'ACT_REV_01',
        type: 'PRIORITIZE_HIGH_MARGIN_B2B',
        title: 'Max Revenue: Prioritize High-Margin B2B (98.0% SLA)',
        description: `Allocating 98.0% usable capacity (${Math.round(b2bAlloc).toLocaleString()} kg) to high-margin B2B accounts. Retail D2C allocation is throttled to 45.0% (${Math.round(d2cAlloc).toLocaleString()} kg).`,
        priority: 'HIGH',
        estimated_impact: `+₹${((totRevenue - 1500000) / 100000).toFixed(2)}L Turnover`,
        trigger_reason: `Max Revenue Strategy Active: Prioritizing unit gross margin premium over retail volume.`,
      });
      dynamicRecs.push({
        action_id: 'ACT_REV_02',
        type: 'THROTTLE_D2C_SPEND',
        title: 'Throttle D2C Ad Spend in Bottleneck Territories',
        description: `Reallocate ₹25,000 ad budget away from Chennai & Pune D2C channels to prevent customer acquisition waste on unfulfillable demand.`,
        priority: 'MEDIUM',
        estimated_impact: 'Save ₹25,000 Spend',
        trigger_reason: `D2C channel fulfillment restricted to 45.0% under revenue optimization policy.`,
      });
    } else if (strat === 'fulfillment') {
      dynamicRecs.push({
        action_id: 'ACT_FUL_01',
        type: 'MAXIMIZE_UNIT_VOLUME',
        title: 'Max Fulfillment: Expand D2C Supply to 68.0%',
        description: `Maximizing total unit volume across retail D2C channels (${Math.round(d2cAlloc).toLocaleString()} kg allocated, up to 68.0% consumer fulfillment).`,
        priority: 'HIGH',
        estimated_impact: '+317 kg D2C Volume',
        trigger_reason: `Max Fulfillment Strategy Active: Maximizing multi-channel unit throughput.`,
      });
      dynamicRecs.push({
        action_id: 'ACT_FUL_02',
        type: 'B2B_SLA_TIERING',
        title: 'Apply Tier-2 SLA Buffer to Release Consumer Batches',
        description: `Maintain B2B contracts at 88.0% SLA floor to release 310 kg spare batch capacity for retail D2C fulfillment.`,
        priority: 'MEDIUM',
        estimated_impact: 'SLA Protected (88%)',
        trigger_reason: `B2B commitments satisfied at SLA baseline while freeing consumer batch stock.`,
      });
    } else {
      dynamicRecs.push({
        action_id: 'ACT_BAL_01',
        type: 'BALANCED_PARTITIONING',
        title: 'Balanced Strategy: Equitable Channel Partitioning',
        description: `Protecting 92.4% B2B contract commitments (${Math.round(b2bAlloc).toLocaleString()} kg) while maintaining baseline 52.6% D2C presence (${Math.round(d2cAlloc).toLocaleString()} kg).`,
        priority: 'HIGH',
        estimated_impact: `${Math.round((totAllocated / (totDemand || 1)) * 1000) / 10}% System Fulfillment`,
        trigger_reason: `Balanced Strategy Active: Equalizing contract protection and retail velocity.`,
      });
    }

    if (risk === 'safe') {
      dynamicRecs.push({
        action_id: 'ACT_RISK_SAFE',
        type: 'CONSERVATIVE_YIELD_BUFFER',
        title: 'Safe Mode: Enforce P10 Yield Margin Buffer',
        description: `Usable plant capacity conservatively capped at ${riskMeta.capacity.toLocaleString()} kg (200 kg safety buffer retained for unplanned maintenance). Deficit gap stands at ${calculatedShortage.toLocaleString()} kg.`,
        priority: 'CRITICAL',
        estimated_impact: '-200 kg Safety Buffer',
        trigger_reason: `Safe Risk Mode Active: P10 yield variance protection enabled.`,
      });
    } else if (risk === 'aggressive') {
      dynamicRecs.push({
        action_id: 'ACT_RISK_AGG',
        type: 'AGGRESSIVE_STRETCH',
        title: 'Aggressive Mode: P90 Plant Throughput Stretch',
        description: `Pushing internal plant capacity to ${riskMeta.capacity.toLocaleString()} kg stretch target. Reduced deficit gap to ${calculatedShortage.toLocaleString()} kg across ${period}.`,
        priority: 'HIGH',
        estimated_impact: '+150 kg Capacity Stretch',
        trigger_reason: `Aggressive Risk Mode Active: Maximum throughput target enabled.`,
      });
    } else {
      dynamicRecs.push({
        action_id: 'ACT_RISK_BAL',
        type: 'STANDARD_YIELD_MONITORING',
        title: 'Balanced Risk: Nominal Plant Yield Operations',
        description: `Operating at expected plant capacity (${riskMeta.capacity.toLocaleString()} kg). Deficit gap managed at ${calculatedShortage.toLocaleString()} kg across ${period} horizon.`,
        priority: 'LOW',
        estimated_impact: 'Nominal Operations',
        trigger_reason: `Balanced Risk Mode Active: Standard operating parameters.`,
      });
    }

    if (calculatedShortage > 0) {
      dynamicRecs.push({
        action_id: 'ACT_SHORTAGE_CO_MFG',
        type: 'ACTIVATE_CO_MANUFACTURING',
        title: `Activate Co-Manufacturing Partner Facility (+500 kg)`,
        description: `Projected demand (${totDemand.toLocaleString()} kg) exceeds usable capacity by ${calculatedShortage.toLocaleString()} kg for ${period}. Activate Western Zone co-manufacturing facility to capture unfulfilled revenue.`,
        priority: 'HIGH',
        estimated_impact: '+₹3,20,000 Revenue',
        trigger_reason: `Plant capacity shortage: ${calculatedShortage.toLocaleString()} kg deficit across ${period}.`,
      });
    }

    return {
      ...base,
      target_period: period,
      strategy: strat,
      risk_mode: risk,
      recommendations: dynamicRecs,
      summary: {
        ...base.summary,
        forecast_demand_kg: totDemand,
        b2b_demand_kg: b2bDem,
        d2c_demand_kg: d2cDem,
        usable_capacity_kg: riskMeta.capacity,
        shortage_kg: calculatedShortage,
        allocated_capacity_kg: totAllocated,
        unfulfilled_demand_kg: calculatedShortage,
        fulfillment_pct: Math.round((totAllocated / (totDemand || 1)) * 1000) / 10,
        b2b_fulfillment_pct: Math.round((b2bAlloc / (b2bDem || 1)) * 1000) / 10,
        d2c_fulfillment_pct: Math.round((d2cAlloc / (d2cDem || 1)) * 1000) / 10,
        projected_revenue_inr: totRevenue,
        risk_level: riskMeta.risk_level,
      },
      capacity_breakdown: {
        ...base.capacity_breakdown,
        total_usable_capacity_kg: riskMeta.capacity,
        total_forecast_demand_kg: totDemand,
        shortage_kg: calculatedShortage,
        has_shortage: calculatedShortage > 0,
        spare_capacity_kg: Math.max(0, riskMeta.capacity - totDemand),
      },
      allocation_plan: {
        ...base.allocation_plan,
        strategy: strat,
        available_capacity_kg: riskMeta.capacity,
        total_demand_kg: totDemand,
        allocated_capacity_kg: totAllocated,
        unfulfilled_demand_kg: calculatedShortage,
        overall_fulfillment_pct: Math.round((totAllocated / (totDemand || 1)) * 1000) / 10,
        b2b_fulfillment_pct: Math.round(stratMultiplier.b2bFill * 1000) / 10,
        d2c_fulfillment_pct: Math.round(stratMultiplier.d2cFill * 1000) / 10,
        total_revenue_inr: totRevenue,
        segments: reactiveSegments as any,
      },
      risk_plan: {
        ...base.risk_plan,
        mode: risk,
        risk_level: riskMeta.risk_level,
        forecast_segments: reactiveSegments.map(s => ({
          region: s.region,
          channel: s.channel,
          point_forecast_kg: s.demand_kg,
          lower_bound_kg: Math.round(s.demand_kg * 0.9),
          upper_bound_kg: Math.round(s.demand_kg * 1.1),
          confidence_level: 0.8
        })),
        capacity_risk: calculatedShortage > 0
          ? `${riskMeta.risk_level} risk: demand (${totDemand} kg) exceeds capacity by ${calculatedShortage} kg under ${risk} mode.`
          : 'Capacity sufficient for projected demand under current risk mode.',
      },
    };
  };

  const loadPlan = async (
    period = targetPeriod,
    strat = strategy,
    risk = riskMode,
    scen = activeScenario
  ) => {
    setIsLoading(true);
    try {
      const DIRECT_API = 'http://127.0.0.1:8000';
      let healthy = false;
      try {
        const hr = await fetch(`${DIRECT_API}/health`, { method: 'GET', cache: 'no-store' });
        healthy = hr.ok && (await hr.json()).status === 'ok';
      } catch { healthy = false; }

      setIsBackendConnected(healthy);

      if (healthy) {
        const res = await fetch(`${DIRECT_API}/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_period: period,
            strategy: strat,
            risk_mode: risk,
            scenario: scen || null,
            orders: DEMO_ORDERS,
            capacity: DEMO_CAPACITY,
            marketing: DEMO_MARKETING,
            b2b_accounts: DEMO_B2B_ACCOUNTS,
          }),
        });
        if (res.ok) {
          setPlan(await res.json());
        } else {
          setPlan(generateReactiveDemoPlan(period, strat, risk));
        }
      } else {
        setPlan(generateReactiveDemoPlan(period, strat, risk));
      }
    } catch {
      setIsBackendConnected(false);
      setPlan(generateReactiveDemoPlan(period, strat, risk));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [targetPeriod, strategy, riskMode]);

  const checkBackendHealth = useCallback(async () => {
    const candidates = [
      'http://127.0.0.1:8000/health',
      'http://localhost:8000/health',
      '/api/health',
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'ok') {
            setIsBackendConnected(true);
            return;
          }
        }
      } catch {}
    }
    setIsBackendConnected(false);
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 5000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  const handleSelectStrategy = (newStrategy: OptimizationStrategy) => {
    setStrategy(newStrategy);
  };

  const handleSelectRiskMode = (newRiskMode: RiskMode) => {
    setRiskMode(newRiskMode);
  };

  const handleApplyScenario = (changes: ScenarioChanges, response: ScenarioResponse) => {
    setActiveScenario(changes);
    setPlan((prev) => ({
      ...prev,
      summary: {
        ...prev.summary,
        usable_capacity_kg: response.scenario.available_capacity_kg,
        shortage_kg: response.scenario.shortage_kg,
        projected_revenue_inr: response.scenario.revenue_inr,
        fulfillment_pct: response.scenario.fulfillment_pct,
      },
      allocation_plan: response.allocation_comparison.scenario_allocation,
      scenario_active: true,
    }));
  };

  const handleResetScenario = () => {
    setActiveScenario(null);
    loadPlan(targetPeriod, strategy, riskMode, null);
  };

  const handleLoadDemoData = () => {
    setPlan(generateReactiveDemoPlan(targetPeriod, strategy, riskMode));
    setActiveScenario(null);
  };

  return (
    <div className="flex h-screen bg-[#F7F7F2] text-[#111111] overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        isBackendConnected={isBackendConnected}
        hasShortage={plan.summary.shortage_kg > 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Financial Marquee / Ticker */}
        <FinancialTicker />

        {/* Top Control Bar */}
        <Topbar
          targetPeriod={targetPeriod}
          onChangePeriod={setTargetPeriod}
          strategy={strategy}
          onChangeStrategy={handleSelectStrategy}
          riskMode={riskMode}
          onChangeRiskMode={handleSelectRiskMode}
          onRefresh={() => loadPlan()}
          isRefreshing={isLoading}
          onLoadDemoData={handleLoadDemoData}
        />

        {/* Dynamic Screen View with Center Dashboard Lab Background */}
        <main
          className="flex-1 overflow-y-auto p-6 transition-all duration-300"
          style={{
            backgroundImage: `linear-gradient(rgba(247, 247, 242, 0.78), rgba(247, 247, 242, 0.86)), url('/assets/biokraft-lab-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }}
        >
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
          ) : (
            <>
              {currentScreen === 'overview' && (
                <Overview
                  plan={plan}
                  onSelectStrategy={handleSelectStrategy}
                  onNavigateScreen={setCurrentScreen}
                />
              )}
              {currentScreen === 'forecast' && <Forecast plan={plan} />}
              {currentScreen === 'allocation' && (
                <Allocation
                  plan={plan}
                  onSelectStrategy={handleSelectStrategy}
                  isUpdatingStrategy={isLoading}
                />
              )}
              {currentScreen === 'scenarios' && (
                <ScenarioLab
                  plan={plan}
                  onApplyScenario={handleApplyScenario}
                  onResetScenario={handleResetScenario}
                />
              )}
              {currentScreen === 'b2b' && <B2BEvaluator plan={plan} />}
              {currentScreen === 'marketing' && <Marketing plan={plan} />}
              {currentScreen === 'risk' && (
                <RiskPlanner plan={plan} onSelectRiskMode={handleSelectRiskMode} />
              )}
              {currentScreen === 'copilot' && (
                <Copilot plan={plan} onNavigateScreen={setCurrentScreen} />
              )}
              {currentScreen === 'plan' && <ActionPlan plan={plan} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

