import React from 'react';
import { ShieldAlert, Shield, ShieldCheck, Zap } from 'lucide-react';
import { OperationalPlan, RiskMode } from '../api/types';
import { Card } from '../components/ui/Card';
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
    <div className="space-y-8 pb-12 font-sans max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-4">
        <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
          06 / RISK PLANNER
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight">
          Uncertainty & risk-aware buffering.
        </h1>
        <p className="text-sm text-[#64645F] max-w-xl">
          Evaluate 80% confidence interval demand bounds and configure plant capacity buffering strategy.
        </p>
      </div>

      {/* System Risk Status Banner */}
      <div className="p-6 rounded-[2px] border bg-[#111111] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-[#9E3B3B]/20 text-[#9E3B3B] rounded-[2px] border border-[#9E3B3B]/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 font-mono">Classification</span>
              <Badge variant="danger" size="sm">
                {summary.risk_level} RISK
              </Badge>
            </div>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">{risk_plan?.capacity_risk}</p>
          </div>
        </div>
      </div>

      {/* 3 Risk Planning Modes */}
      <Card
        title="OPERATIONAL RISK MODES"
        subtitle="Configure how conservative or aggressive plant capacity buffering should be"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 font-sans">
          {[
            {
              id: 'aggressive',
              title: 'Aggressive Mode',
              icon: <Zap className="w-5 h-5 text-[#111111]" />,
              badge: 'Upper Bound',
              badgeVar: 'warning',
              desc: 'Plans against Upper Bound demand (105% of forecast). Maximizes revenue potential but carries stockout risk if co-manufacturing is delayed.',
            },
            {
              id: 'balanced',
              title: 'Balanced Mode',
              icon: <Shield className="w-5 h-5 text-[#324C3A]" />,
              badge: 'Point Forecast',
              badgeVar: 'teal',
              desc: 'Plans against Point Forecast demand. Optimizes plant utilization while protecting high-priority B2B contract SLAs.',
            },
            {
              id: 'safe',
              title: 'Safe / Conservative',
              icon: <ShieldCheck className="w-5 h-5 text-[#324C3A]" />,
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
                className={`p-5 rounded-[2px] border text-left transition-all cursor-pointer space-y-3 ${
                  isCurrent
                    ? 'bg-[#324C3A] text-white border-[#324C3A]'
                    : 'bg-[#F7F7F2] hover:bg-[#DEDED8]/30 border-[#DEDED8] text-[#111111]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isCurrent ? 'text-white' : 'text-[#111111]'}`}>
                      {mode.title}
                    </h3>
                  </div>
                  <Badge variant={mode.badgeVar as any} size="sm">
                    {mode.badge}
                  </Badge>
                </div>
                <p className={`text-xs leading-relaxed ${isCurrent ? 'text-white/80' : 'text-[#64645F]'}`}>
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Uncertainty Bounds Table */}
      <Card
        title="DEMAND UNCERTAINTY BOUNDS (80% CI)"
        subtitle="Expected point forecast versus residual confidence interval limits"
      >
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#DEDED8] bg-[#F7F7F2] text-[#64645F] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Lower Bound (Safe)</th>
                <th className="py-3 px-4 text-right font-bold text-[#111111]">Point Forecast</th>
                <th className="py-3 px-4 text-right">Upper Bound (Aggressive)</th>
                <th className="py-3 px-4 text-center">Uncertainty Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEDED8]">
              {(risk_plan?.forecast_segments || []).map((seg, idx) => (
                <tr key={idx} className="hover:bg-[#F7F7F2]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#111111]">{seg.region}</td>
                  <td className="py-3 px-4">
                    <Badge variant={seg.channel === 'B2B' ? 'teal' : 'info'} size="sm">
                      {seg.channel}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#324C3A]">{seg.lower_bound_kg.toLocaleString()} kg</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#111111]">{seg.point_forecast_kg.toLocaleString()} kg</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#9E3B3B]">{seg.upper_bound_kg.toLocaleString()} kg</td>
                  <td className="py-3 px-4 text-center font-mono">
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

