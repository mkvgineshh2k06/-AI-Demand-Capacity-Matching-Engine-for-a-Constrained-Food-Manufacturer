import React from 'react';
import { FileText, Printer, CheckCircle2 } from 'lucide-react';
import { OperationalPlan } from '../api/types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface ActionPlanProps {
  plan: OperationalPlan;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({ plan }) => {
  const { summary, recommendations, allocation_plan } = plan;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12 print:p-0 font-sans max-w-7xl mx-auto">
      {/* Header & Print Control */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
              08 / EXECUTIVE DIRECTIVES
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight mt-1">
              Operational action plan report.
            </h1>
            <p className="text-sm text-[#64645F] max-w-xl mt-1">
              Master decision brief for executive signoff, deployment, and facility-level allocation directives.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="md" onClick={handlePrint} icon={<Printer className="w-4 h-4 text-[#111111]" />}>
              Export / Print PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report Document Box */}
      <div className="p-8 space-y-8 bg-white border border-[#DEDED8] rounded-[2px]">
        {/* Document Header */}
        <div className="border-b border-[#DEDED8] pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#324C3A] font-mono">
              BIOKRAFT FOODS — EXECUTIVE OPERATIONAL DIRECTIVE
            </span>
            <h2 className="text-2xl font-bold text-[#111111] tracking-tight mt-1">
              Target Horizon Plan: {plan.target_period}
            </h2>
            <div className="text-xs text-[#64645F] mt-2 flex items-center gap-3 font-mono">
              <span>Strategy: <strong className="text-[#111111] uppercase">{plan.strategy}</strong></span>
              <span>•</span>
              <span>Risk Mode: <strong className="text-[#111111] uppercase">{plan.risk_mode}</strong></span>
            </div>
          </div>

          <div className="sm:text-right font-mono">
            <Badge variant={summary.shortage_kg > 0 ? 'danger' : 'success'} size="md">
              {summary.risk_level} RISK LEVEL
            </Badge>
            <div className="text-[10px] text-[#64645F] mt-2 uppercase tracking-wider">Engine Generated Brief</div>
          </div>
        </div>

        {/* Master Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F] font-sans">Forecast Demand</span>
            <div className="text-xl font-bold text-[#111111] mt-1">{summary.forecast_demand_kg.toLocaleString()} kg</div>
            <span className="text-[11px] text-[#64645F] mt-1 block">B2B: {summary.b2b_demand_kg} | D2C: {summary.d2c_demand_kg}</span>
          </div>

          <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F] font-sans">Usable Capacity</span>
            <div className="text-xl font-bold text-[#111111] mt-1">{summary.usable_capacity_kg.toLocaleString()} kg</div>
            <span className="text-[11px] text-[#64645F] mt-1 block">Internal + Co-Mfg</span>
          </div>

          <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F] font-sans">Projected Deficit</span>
            <div className="text-xl font-bold text-[#9E3B3B] mt-1">{summary.shortage_kg.toLocaleString()} kg</div>
            <span className="text-[11px] text-[#9E3B3B] font-semibold mt-1 block">{summary.shortage_kg > 0 ? 'Shortfall Gap' : 'Balanced'}</span>
          </div>

          <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F] font-sans">Est. Revenue</span>
            <div className="text-xl font-bold text-[#324C3A] mt-1">₹{(summary.projected_revenue_inr / 100000).toFixed(2)}L</div>
            <span className="text-[11px] text-[#64645F] mt-1 block">SLA: {summary.fulfillment_pct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Priority Action Items */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#324C3A]" /> Mandated Operational Directives
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-5 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={rec.priority === 'HIGH' ? 'danger' : rec.priority === 'MEDIUM' ? 'warning' : 'info'} size="sm">
                      {rec.priority}
                    </Badge>
                    <h4 className="text-xs font-bold text-[#111111] font-mono">{rec.title}</h4>
                  </div>
                  {rec.estimated_impact && (
                    <Badge variant="teal" size="sm" className="font-mono font-semibold">
                      {rec.estimated_impact}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#64645F] leading-relaxed font-sans">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Summary Table */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono">
            Facility Allocation Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-[#DEDED8] bg-[#F7F7F2] text-[#64645F] font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Segment</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Demand (kg)</th>
                  <th className="py-3 px-4 text-right">Allocated (kg)</th>
                  <th className="py-3 px-4 text-right">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEDED8]">
                {(allocation_plan.segments || []).map((seg) => (
                  <tr key={seg.segment_id} className="hover:bg-[#F7F7F2]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111111]">{seg.segment_id}</td>
                    <td className="py-3 px-4 font-medium">{seg.region}</td>
                    <td className="py-3 px-4">{seg.channel}</td>
                    <td className="py-3 px-4 text-right font-mono">{seg.demand_kg.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#324C3A]">{seg.allocated_kg.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{seg.fulfillment_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

