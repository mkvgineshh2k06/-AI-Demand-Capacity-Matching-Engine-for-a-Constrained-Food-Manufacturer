import React from 'react';
import { ShieldAlert, Shield, ShieldCheck, Zap, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { OperationalPlan, RiskMode } from '../api/types';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

interface RiskPlannerProps {
  plan: OperationalPlan;
  onSelectRiskMode: (mode: RiskMode) => void;
}

export const RiskPlanner: React.FC<RiskPlannerProps> = ({
  plan,
  onSelectRiskMode,
}) => {
  const { risk_plan, summary } = plan;
  const currentMode = plan.risk_mode || 'balanced';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-700" />
          Uncertainty & Risk-Aware Operational Planner
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate 80% confidence interval demand bounds and configure risk buffers
        </p>
      </div>

      {/* Risk Level Banner */}
      <div className="p-4 rounded-xl border bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">System Risk Classification</span>
              <Badge variant="danger" size="sm">
                {summary.risk_level} RISK
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{risk_plan?.capacity_risk}</p>
          </div>
        </div>
      </div>

      {/* 3 Risk Planning Modes */}
      <Card
        title="Select Operational Risk Planning Mode"
        subtitle="Choose how conservative or aggressive plant capacity buffering should be"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {[
            {
              id: 'aggressive',
              title: 'Aggressive Planning',
              icon: <Zap className="w-5 h-5 text-amber-500" />,
              badge: 'Upper Bound',
              badgeVar: 'warning',
              desc: 'Plans against Upper Bound demand (105% of forecast). Maximizes revenue potential but carries high stockout risk if co-manufacturing is delayed.',
            },
            {
              id: 'balanced',
              title: 'Balanced Planning',
              icon: <Shield className="w-5 h-5 text-teal-500" />,
              badge: 'Point Forecast',
              badgeVar: 'teal',
              desc: 'Plans against Point Forecast demand (expected value). Optimizes plant utilization and fulfills high-priority B2B commitments.',
            },
            {
              id: 'safe',
              title: 'Safe / Conservative',
              icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
              badge: 'Lower Bound',
              badgeVar: 'success',
              desc: 'Plans against Lower Bound demand (95% of forecast). Guarantees 100% SLA fulfillment with zero risk of unfulfilled orders.',
            },
          ].map((mode) => {
            const isCurrent = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onSelectRiskMode(mode.id as RiskMode)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-3 ${
                  isCurrent
                    ? 'bg-teal-900 text-white border-teal-700 shadow-md ring-2 ring-teal-500/50'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <h3 className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                      {mode.title}
                    </h3>
                  </div>
                  <Badge variant={mode.badgeVar as any} size="sm">
                    {mode.badge}
                  </Badge>
                </div>
                <p className={`text-xs leading-relaxed ${isCurrent ? 'text-teal-100/90' : 'text-slate-500'}`}>
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Uncertainty Bounds Table */}
      <Card
        title="Segment Demand Uncertainty Bounds (80% CI)"
        subtitle="Expected point forecast vs residual uncertainty limits"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Lower Bound (Safe)</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900">Point Forecast</th>
                <th className="py-2.5 px-3 text-right">Upper Bound (Aggressive)</th>
                <th className="py-2.5 px-3 text-center">Uncertainty Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(risk_plan?.forecast_segments || []).map((seg, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{seg.region}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={seg.channel === 'B2B' ? 'teal' : 'info'} size="sm">
                      {seg.channel}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{seg.lower_bound_kg} kg</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{seg.point_forecast_kg} kg</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-semibold">{seg.upper_bound_kg} kg</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="neutral" size="sm">
                      ±{Math.round((seg.upper_bound_kg - seg.lower_bound_kg) / 2)} kg
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
