import React from 'react';
import {
  TrendingUp, HardDrive, AlertTriangle, ShieldCheck, DollarSign,
  CheckCircle2, ArrowRight, ShieldAlert, Zap
} from 'lucide-react';
import { OperationalPlan, OptimizationStrategy } from '../api/types';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';

interface OverviewProps {
  plan: OperationalPlan;
  onSelectStrategy: (strat: OptimizationStrategy) => void;
  onNavigateScreen: (screen: any) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  plan,
  onSelectStrategy,
  onNavigateScreen,
}) => {
  const { summary, recommendations, allocation_plan } = plan;

  // Chart data: Segment demand vs allocation by region
  const regionData = React.useMemo(() => {
    const map: Record<string, { region: string; demand: number; allocated: number; unfulfilled: number }> = {};
    (allocation_plan.segments || []).forEach((seg: any) => {
      if (!map[seg.region]) {
        map[seg.region] = { region: seg.region, demand: 0, allocated: 0, unfulfilled: 0 };
      }
      const dem = seg.demand_kg ?? seg.forecast_demand_kg ?? 0;
      const alloc = seg.allocated_kg ?? 0;
      const unful = seg.unfulfilled_kg ?? Math.max(0, dem - alloc);

      map[seg.region].demand += dem;
      map[seg.region].allocated += alloc;
      map[seg.region].unfulfilled += unful;
    });
    return Object.values(map);
  }, [allocation_plan]);

  // Channel breakdown (Dynamic Allocation vs Forecast Demand per Channel)
  const channelData = React.useMemo(() => {
    let b2bDem = 0, b2bAlloc = 0;
    let d2cDem = 0, d2cAlloc = 0;

    (allocation_plan.segments || []).forEach((seg: any) => {
      const d = seg.demand_kg ?? seg.forecast_demand_kg ?? 0;
      const a = seg.allocated_kg ?? 0;
      if (seg.channel === 'B2B') {
        b2bDem += d;
        b2bAlloc += a;
      } else {
        d2cDem += d;
        d2cAlloc += a;
      }
    });

    if (b2bDem === 0) b2bDem = summary.b2b_demand_kg || 3100;
    if (d2cDem === 0) d2cDem = summary.d2c_demand_kg || 2060;

    const b2bFul = summary.b2b_fulfillment_pct ?? (b2bDem > 0 ? (b2bAlloc / b2bDem) * 100 : 0);
    const d2cFul = summary.d2c_fulfillment_pct ?? (d2cDem > 0 ? (d2cAlloc / d2cDem) * 100 : 0);

    return [
      {
        name: 'B2B Contracts',
        demand: b2bDem,
        allocated: b2bAlloc > 0 ? b2bAlloc : Math.round(b2bDem * (b2bFul / 100)),
        fulfillment_pct: b2bFul,
        color: '#324C3A',
      },
      {
        name: 'D2C Consumer',
        demand: d2cDem,
        allocated: d2cAlloc > 0 ? d2cAlloc : Math.round(d2cDem * (d2cFul / 100)),
        fulfillment_pct: d2cFul,
        color: '#718B6B',
      },
    ];
  }, [allocation_plan, summary]);

  return (
    <div className="space-y-8 pb-12 font-sans max-w-7xl mx-auto">
      {/* Editorial Control Room Hero Banner */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
              BIOKRAFT OPERATIONS INTELLIGENCE
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-[#111111] tracking-tight leading-tight">
              Demand meets capacity.<br />
              <span className="text-[#324C3A]">Decisions follow.</span>
            </h1>
            <p className="text-sm text-[#64645F] font-normal max-w-xl">
              AI-assisted operational planning across D2C, B2B contracts, internal production, co-manufacturing, and strategic marketing budget allocation.
            </p>
          </div>

          {/* Hero Key Metric Blocks */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-[#F7F7F2] border border-[#DEDED8] p-4 rounded-[2px] min-w-[120px]">
              <div className="text-[10px] font-bold tracking-widest text-[#64645F] uppercase">
                Forecast Demand
              </div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {summary.forecast_demand_kg.toLocaleString()} <span className="text-xs font-normal text-[#64645F]">kg</span>
              </div>
            </div>
            <div className="bg-[#F7F7F2] border border-[#DEDED8] p-4 rounded-[2px] min-w-[120px]">
              <div className="text-[10px] font-bold tracking-widest text-[#64645F] uppercase">
                Capacity
              </div>
              <div className="text-2xl font-bold text-[#324C3A] mt-1">
                {summary.usable_capacity_kg.toLocaleString()} <span className="text-xs font-normal text-[#64645F]">kg</span>
              </div>
            </div>
            <div className={`p-4 rounded-[2px] min-w-[120px] border ${
              summary.shortage_kg > 0 ? 'bg-[#FDF2F2] border-[#EAA8A8]' : 'bg-[#E8EFE5] border-[#718B6B]/40'
            }`}>
              <div className={`text-[10px] font-bold tracking-widest uppercase ${
                summary.shortage_kg > 0 ? 'text-[#9E3B3B]' : 'text-[#324C3A]'
              }`}>
                Shortage
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                summary.shortage_kg > 0 ? 'text-[#9E3B3B]' : 'text-[#324C3A]'
              }`}>
                {summary.shortage_kg.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alert / Status Banner */}
      {summary.shortage_kg > 0 ? (
        <div className="bg-[#FDF2F2] border border-[#EAA8A8] text-[#111111] p-4 rounded-[2px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-[#9E3B3B] text-white rounded-[2px] shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9E3B3B]">
                  Capacity Risk Alert / {summary.risk_level}
                </span>
              </div>
              <p className="text-xs text-[#64645F] mt-0.5">
                Demand exceeds expected production capacity by <strong className="text-[#111111] font-bold">{summary.shortage_kg.toLocaleString()} kg</strong>. Recommended: Activate additional co-manufacturing or adjust channel allocation.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateScreen('scenarios')}
            className="border-[#9E3B3B] text-[#9E3B3B] hover:bg-[#9E3B3B] hover:text-white shrink-0"
          >
            Simulate Mitigation
          </Button>
        </div>
      ) : (
        <div className="bg-[#E8EFE5] border border-[#718B6B]/40 text-[#324C3A] p-4 rounded-[2px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#324C3A] text-white rounded-[2px]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#324C3A]">
                Capacity Status / Optimal
              </span>
              <p className="text-xs text-[#324C3A]/90 mt-0.5">
                Available production capacity ({summary.usable_capacity_kg.toLocaleString()} kg) satisfies projected demand.
              </p>
            </div>
          </div>
          <Badge variant="success">LOW RISK</Badge>
        </div>
      )}

      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Forecast Demand"
          value={summary.forecast_demand_kg}
          unit="kg"
          subtitle="Q2 Period Total"
        />
        <StatCard
          title="Usable Capacity"
          value={summary.usable_capacity_kg}
          unit="kg"
          subtitle="Internal + Co-Mfg"
        />
        <StatCard
          title="Projected Gap"
          value={summary.shortage_kg > 0 ? `-${summary.shortage_kg}` : `+${summary.usable_capacity_kg - summary.forecast_demand_kg}`}
          unit="kg"
          subtitle={summary.shortage_kg > 0 ? 'Deficit Shortage' : 'Spare Buffer'}
          badgeText={summary.shortage_kg > 0 ? 'Shortage' : 'Surplus'}
          badgeVariant={summary.shortage_kg > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Utilization"
          value={`${summary.utilization_pct.toFixed(1)}%`}
          subtitle="Plant Capacity Load"
          badgeText={summary.utilization_pct >= 95 ? 'Peak' : 'Normal'}
          badgeVariant={summary.utilization_pct >= 95 ? 'warning' : 'info'}
        />
        <StatCard
          title="Projected Revenue"
          value={`₹${(summary.projected_revenue_inr / 100000).toFixed(2)}L`}
          subtitle={`₹${summary.projected_revenue_inr.toLocaleString('en-IN')}`}
        />
        <StatCard
          title="Fulfillment"
          value={`${summary.fulfillment_pct.toFixed(1)}%`}
          subtitle={`B2B: ${summary.b2b_fulfillment_pct.toFixed(0)}% | D2C: ${summary.d2c_fulfillment_pct.toFixed(0)}%`}
          highlight={true}
        />
      </div>

      {/* Main Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Allocation Chart */}
        <Card
          title="Regional Demand vs Capacity Allocation"
          subtitle="Comparison of demand and allocated capacity across operational territories"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateScreen('allocation')}>
              View Allocation <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#DEDED8" />
                <XAxis dataKey="region" tickLine={false} axisLine={{ stroke: '#DEDED8' }} tick={{ fill: '#64645F', fontSize: 11, fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64645F', fontSize: 11 }} unit=" kg" />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, '']}
                  contentStyle={{ backgroundColor: '#111111', borderColor: '#262624', color: '#fff', borderRadius: '2px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="demand" name="Forecast Demand" fill="#DEDED8" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="allocated" name="Allocated Capacity" fill="#324C3A" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="unfulfilled" name="Shortage Gap" fill="#9E3B3B" radius={[2, 2, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Channel Breakdown */}
        <Card
          title="Channel Distribution"
          subtitle="Contractual B2B commitments vs D2C retail volume"
          action={<Badge variant="neutral">Ratio: {(summary.b2b_demand_kg / (summary.d2c_demand_kg || 1)).toFixed(1)}:1</Badge>}
        >
          <div className="space-y-4 pt-2">
            {channelData.map((ch) => {
              const fulPct = Math.min(100, Math.max(0, ch.fulfillment_pct));
              return (
                <div key={ch.name} className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#111111] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                      {ch.name}
                    </span>
                    <span className="text-[#111111] font-mono font-bold">
                      {ch.allocated.toLocaleString()} / {ch.demand.toLocaleString()} kg ({fulPct.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Fulfillment Progress Bar */}
                  <div className="w-full bg-[#DEDED8] h-1.5 rounded-[2px] overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${fulPct}%`, backgroundColor: ch.color }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-[#E8EFE5] border border-[#718B6B]/40 rounded-[2px] text-xs space-y-1">
              <span className="font-bold text-[#324C3A] flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#324C3A]" /> Priority Rule Enforced
              </span>
              <p className="text-[#324C3A] text-[11px] leading-relaxed">
                High-priority B2B contract SLAs take precedent. Usable capacity is automatically partitioned to fulfill contractual obligations first.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Strategy Control & Top Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Control Selector */}
        <Card
          title="Optimization Strategy"
          subtitle="Select mathematical objective policy"
        >
          <div className="space-y-3">
            {[
              {
                id: 'balanced',
                title: 'Balanced Optimization',
                desc: 'Equitably satisfies high-margin B2B commitments while preserving baseline D2C presence.',
              },
              {
                id: 'revenue',
                title: 'Max Revenue Strategy',
                desc: 'Prioritizes high unit-price D2C and premium accounts to maximize total INR turnover.',
              },
              {
                id: 'fulfillment',
                title: 'Max Fulfillment Strategy',
                desc: 'Maximizes overall volume fulfilled (kg) to maintain market share across all channels.',
              },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => onSelectStrategy(st.id as OptimizationStrategy)}
                className={`w-full text-left p-3.5 rounded-[2px] border transition-all cursor-pointer ${
                  plan.strategy === st.id
                    ? 'bg-[#E8EFE5] border-[#324C3A] text-[#111111]'
                    : 'bg-white border-[#DEDED8] hover:border-[#718B6B]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">{st.title}</span>
                  {plan.strategy === st.id && <Badge variant="success">Active</Badge>}
                </div>
                <p className="text-xs text-[#64645F] mt-1 leading-relaxed">{st.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* AI Operational Recommendations */}
        <Card
          title="AI Operational Recommendations"
          subtitle="Deterministic mitigation actions generated by optimization engine"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec, idx) => (
              <div
                key={rec.action_id || idx}
                className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={rec.priority === 'HIGH' || rec.priority === 'CRITICAL' ? 'danger' : rec.priority === 'MEDIUM' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {rec.priority}
                    </Badge>
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-[#64645F] leading-relaxed">{rec.description}</p>
                  <div className="text-[10px] text-[#64645F] font-mono">
                    Trigger: {rec.trigger_reason}
                  </div>
                </div>
                {rec.estimated_impact && (
                  <Badge variant="teal" size="md" className="shrink-0 font-bold font-mono">
                    {rec.estimated_impact}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

