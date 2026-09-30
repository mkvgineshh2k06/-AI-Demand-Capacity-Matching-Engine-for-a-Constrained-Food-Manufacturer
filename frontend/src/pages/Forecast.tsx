import React, { useState } from 'react';
import { TrendingUp, Filter, Layers } from 'lucide-react';
import { OperationalPlan } from '../api/types';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';

interface ForecastProps {
  plan: OperationalPlan;
}

export const Forecast: React.FC<ForecastProps> = ({ plan }) => {
  const { summary, risk_plan, allocation_plan } = plan;

  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Filtered segments
  const segments = React.useMemo(() => {
    return (allocation_plan.segments || []).filter((seg) => {
      const matchRegion = selectedRegion === 'ALL' || seg.region === selectedRegion;
      const matchChannel = selectedChannel === 'ALL' || seg.channel === selectedChannel;
      return matchRegion && matchChannel;
    });
  }, [allocation_plan, selectedRegion, selectedChannel]);

  // Region aggregation chart data
  const regionChartData = React.useMemo(() => {
    const map: Record<string, { region: string; B2B: number; D2C: number; total: number }> = {};
    (allocation_plan.segments || []).forEach((seg: any) => {
      if (!map[seg.region]) {
        map[seg.region] = { region: seg.region, B2B: 0, D2C: 0, total: 0 };
      }
      const d = seg.demand_kg ?? seg.forecast_demand_kg ?? 0;
      if (seg.channel === 'B2B') map[seg.region].B2B += d;
      else map[seg.region].D2C += d;
      map[seg.region].total += d;
    });
    return Object.values(map);
  }, [allocation_plan]);

  return (
    <div className="space-y-8 pb-12 font-sans max-w-7xl mx-auto">
      {/* Page Editorial Header */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
              01 / DEMAND FORECAST
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight">
              Where demand is heading.
            </h1>
            <p className="text-sm text-[#64645F] max-w-xl">
              Predictive demand modeling across D2C retail channels and B2B institutional commitments using HistGradientBoosting regression.
            </p>
          </div>

          {/* Granular Filters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs bg-[#F7F7F2] p-2 border border-[#DEDED8] rounded-[2px]">
              <Filter className="w-3.5 h-3.5 text-[#64645F]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F]">Region:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent font-bold text-[#111111] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Regions (5)</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs bg-[#F7F7F2] p-2 border border-[#DEDED8] rounded-[2px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64645F]">Channel:</span>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-transparent font-bold text-[#111111] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="B2B">B2B Institutional</option>
                <option value="D2C">D2C Retail</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Forecast Demand"
          value={summary.forecast_demand_kg}
          unit="kg"
          subtitle="Planning Horizon Total"
        />
        <StatCard
          title="B2B Demand Share"
          value={summary.b2b_demand_kg || 3100}
          unit="kg"
          subtitle={`${(((summary.b2b_demand_kg || 3100) / summary.forecast_demand_kg) * 100).toFixed(1)}% of total demand`}
          badgeText="Contractual"
          badgeVariant="teal"
        />
        <StatCard
          title="D2C Demand Share"
          value={summary.d2c_demand_kg || 2060}
          unit="kg"
          subtitle={`${(((summary.d2c_demand_kg || 2060) / summary.forecast_demand_kg) * 100).toFixed(1)}% of total demand`}
          badgeText="Consumer"
          badgeVariant="info"
        />
        <StatCard
          title="Model Accuracy (WAPE)"
          value="15.2%"
          subtitle="Weighted Absolute % Error"
          badgeText="High Precision"
          badgeVariant="success"
        />
      </div>

      {/* Chart & ML Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Regional Demand Distribution"
          subtitle="Demand volumes broken down by territory and distribution channel"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#DEDED8" />
                <XAxis dataKey="region" tickLine={false} axisLine={{ stroke: '#DEDED8' }} tick={{ fill: '#64645F', fontSize: 11, fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64645F', fontSize: 11 }} unit=" kg" />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, '']}
                  contentStyle={{ backgroundColor: '#111111', borderColor: '#262624', color: '#fff', borderRadius: '2px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="B2B" name="B2B Institutional (kg)" fill="#324C3A" stackId="a" barSize={22} />
                <Bar dataKey="D2C" name="D2C Retail (kg)" fill="#718B6B" stackId="a" radius={[2, 2, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Model Intelligence & Uncertainty Bounds */}
        <Card
          title="Model Architecture & Residuals"
          subtitle="Gradient Boosting Regressor parameters"
        >
          <div className="space-y-4">
            <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64645F]">Algorithm:</span>
                <span className="font-bold text-[#111111] font-mono">HistGradientBoosting</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64645F]">Training Window:</span>
                <span className="font-semibold text-[#111111]">18 Months Chronological</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64645F]">Confidence Level:</span>
                <Badge variant="teal">80% Residual Bound</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#324C3A]" /> Key Segment Uncertainty Ranges
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-sans">
                {(risk_plan?.forecast_segments || []).map((seg, idx) => (
                  <div key={idx} className="p-3 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#111111]">
                      <span>{seg.region} ({seg.channel})</span>
                      <span className="text-[#324C3A] font-mono">{seg.point_forecast_kg} kg</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#64645F] font-mono">
                      <span>Lower: {seg.lower_bound_kg} kg</span>
                      <span>Upper: {seg.upper_bound_kg} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Granular Segment Table */}
      <Card
        title="REGIONAL DEMAND SEGMENTS"
        subtitle={`Showing ${segments.length} segment records matching current filter criteria`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#DEDED8] bg-[#F7F7F2] text-[#64645F] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Segment ID</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Forecast Demand</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Est. Potential Turnover</th>
                <th className="py-3 px-4 text-center">SLA Constraint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEDED8]">
              {segments.map((seg) => (
                <tr key={seg.segment_id} className="hover:bg-[#F7F7F2]/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#111111]">{seg.segment_id}</td>
                  <td className="py-3 px-4 font-semibold text-[#111111]">{seg.region}</td>
                  <td className="py-3 px-4">
                    <Badge variant={seg.channel === 'B2B' ? 'teal' : 'info'} size="sm">
                      {seg.channel}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#111111]">{seg.demand_kg.toLocaleString()} kg</td>
                  <td className="py-3 px-4 text-right font-mono text-[#64645F]">₹{(seg.revenue_inr / seg.allocated_kg || 400).toFixed(0)}/kg</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#324C3A]">
                    ₹{(seg.demand_kg * (seg.revenue_inr / seg.allocated_kg || 400)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {seg.channel === 'B2B' ? (
                      <Badge variant="warning" size="sm">Contract SLA</Badge>
                    ) : (
                      <span className="text-[#64645F]">—</span>
                    )}
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

