import React from 'react';
import {
  TrendingUp, HardDrive, AlertTriangle, ShieldCheck, DollarSign,
  PieChart, CheckCircle2, ArrowRight, ShieldAlert, Zap
} from 'lucide-react';
import { OperationalPlan, OptimizationStrategy } from '../api/types';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell
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
        color: '#0d9488',
      },
      {
        name: 'D2C Consumer',
        demand: d2cDem,
        allocated: d2cAlloc > 0 ? d2cAlloc : Math.round(d2cDem * (d2cFul / 100)),
        fulfillment_pct: d2cFul,
        color: '#38bdf8',
      },
    ];
  }, [allocation_plan, summary]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Risk Alert */}
      {summary.shortage_kg > 0 ? (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 border border-rose-800 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-800/60 rounded-lg text-rose-300 shrink-0 mt-0.5 md:mt-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-300">
                  Capacity Deficit Warning
                </h2>
                <Badge variant="danger" size="sm">
                  {summary.risk_level} RISK
                </Badge>
              </div>
              <p className="text-xs text-rose-100/90 mt-1">
                Projected forecast demand ({summary.forecast_demand_kg.toLocaleString()} kg) exceeds available usable capacity ({summary.usable_capacity_kg.toLocaleString()} kg) by{' '}
                <strong className="text-white underline">{summary.shortage_kg.toLocaleString()} kg</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateScreen('scenarios')}
              className="bg-rose-900/60 border-rose-700 text-white hover:bg-rose-800"
            >
              Simulate Mitigation
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-800 text-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/60 rounded-lg text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                Capacity Operational & Feasible
              </h2>
              <p className="text-xs text-emerald-100/90">
                Available production capacity ({summary.usable_capacity_kg.toLocaleString()} kg) fully satisfies forecast demand ({summary.forecast_demand_kg.toLocaleString()} kg).
              </p>
            </div>
          </div>
          <Badge variant="success">LOW RISK</Badge>
        </div>
      )}

      {/* 6 Executive KPI StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Forecast Demand"
          value={summary.forecast_demand_kg}
          unit="kg"
          subtitle="Total Q2 Period"
          icon={<TrendingUp className="w-4 h-4 text-teal-700" />}
        />
        <StatCard
          title="Usable Capacity"
          value={summary.usable_capacity_kg}
          unit="kg"
          subtitle="Internal + Co-Mfg"
          icon={<HardDrive className="w-4 h-4 text-teal-700" />}
        />
        <StatCard
          title="Projected Gap"
          value={summary.shortage_kg > 0 ? `-${summary.shortage_kg}` : `+${summary.usable_capacity_kg - summary.forecast_demand_kg}`}
          unit="kg"
          subtitle={summary.shortage_kg > 0 ? 'Deficit Shortage' : 'Spare Buffer'}
          badgeText={summary.shortage_kg > 0 ? 'Deficit' : 'Surplus'}
          badgeVariant={summary.shortage_kg > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Utilization"
          value={`${summary.utilization_pct.toFixed(1)}%`}
          subtitle="Plant Capacity"
          badgeText={summary.utilization_pct >= 95 ? 'Peak Load' : 'Normal'}
          badgeVariant={summary.utilization_pct >= 95 ? 'warning' : 'info'}
        />
        <StatCard
          title="Projected Revenue"
          value={`₹${(summary.projected_revenue_inr / 100000).toFixed(2)}L`}
          subtitle={`₹${summary.projected_revenue_inr.toLocaleString('en-IN')}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-700" />}
        />
        <StatCard
          title="Fulfillment Rate"
          value={`${summary.fulfillment_pct.toFixed(1)}%`}
          subtitle={`B2B: ${summary.b2b_fulfillment_pct.toFixed(0)}% | D2C: ${summary.d2c_fulfillment_pct.toFixed(0)}%`}
          highlight={true}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand vs Allocation Chart */}
        <Card
          title="Regional Demand vs Allocated Capacity"
          subtitle="Comparison of unfulfilled demand gaps across operational territories"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateScreen('allocation')}>
              Detailed Allocation <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="region" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} unit=" kg" />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="demand" name="Forecast Demand" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="allocated" name="Allocated Capacity" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="unfulfilled" name="Shortage Gap" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* D2C vs B2B Channel Breakdown */}
        <Card
          title="Demand Channel Breakdown"
          subtitle="Contractual B2B Commitments vs D2C Volume"
          action={<Badge variant="teal">Ratio: {(summary.b2b_demand_kg / (summary.d2c_demand_kg || 1)).toFixed(1)}:1</Badge>}
        >
          <div className="space-y-4 pt-2">
            {channelData.map((ch) => {
              const fulPct = Math.min(100, Math.max(0, ch.fulfillment_pct));
              return (
                <div key={ch.name} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                      {ch.name}
                    </span>
                    <span className="text-slate-900 font-bold">
                      {ch.allocated.toLocaleString()} / {ch.demand.toLocaleString()} kg ({fulPct.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Channel fulfillment progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${fulPct}%`, backgroundColor: ch.color }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-teal-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" /> SLA Protection Priority
              </span>
              <p className="text-teal-800 text-[11px] leading-relaxed">
                B2B contracts have enforced minimum commitment thresholds. The optimizer protects high-margin B2B commitments ahead of retail D2C spikes.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Strategy Control & Top Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Selector Panel */}
        <Card
          title="Optimizer Strategy"
          subtitle="Select allocation policy to redistribute usable capacity"
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
                className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  plan.strategy === st.id
                    ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{st.title}</span>
                  {plan.strategy === st.id && <Badge variant="teal">Active Policy</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{st.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Top Operational Recommendations */}
        <Card
          title="Top AI Operational Recommendations"
          subtitle="Deterministic mitigation actions generated by optimization engine"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec, idx) => (
              <div
                key={rec.action_id || idx}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg flex items-start justify-between gap-3 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={rec.priority === 'HIGH' ? 'danger' : rec.priority === 'MEDIUM' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {rec.priority} PRIORITY
                    </Badge>
                    <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                  <div className="text-[11px] text-slate-500 italic">
                    Trigger: {rec.trigger_reason}
                  </div>
                </div>
                {rec.estimated_impact && (
                  <Badge variant="teal" size="md" className="shrink-0 font-semibold">
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
