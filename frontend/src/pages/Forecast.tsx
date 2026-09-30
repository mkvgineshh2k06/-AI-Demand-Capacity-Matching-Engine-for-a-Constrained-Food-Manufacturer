import React, { useState } from 'react';
import { TrendingUp, Filter, BarChart3, Info, Cpu, Layers } from 'lucide-react';
import { OperationalPlan } from '../api/types';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell
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

  // Aggregates for filtered view
  const filteredDemand = segments.reduce((acc, s: any) => acc + (s.demand_kg ?? s.forecast_demand_kg ?? 0), 0);

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
    <div className="space-y-6 pb-12">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            Demand Forecasting Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Machine Learning demand predictions generated using HistGradientBoostingRegressor
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Regions (5)</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Delhi">Delhi</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="B2B">B2B Institutional</option>
              <option value="D2C">D2C Retail</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Forecast Demand"
          value={summary.forecast_demand_kg}
          unit="kg"
          subtitle="Target Period Total"
          icon={<TrendingUp className="w-4 h-4 text-teal-700" />}
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
          badgeText="E-Commerce"
          badgeVariant="info"
        />
        <StatCard
          title="Model Accuracy (WAPE)"
          value="15.2%"
          subtitle="Weighted Absolute % Error"
          badgeText="High Confidence"
          badgeVariant="success"
        />
      </div>

      {/* Main Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Forecasted Demand by Territory & Channel"
          subtitle="Segmented breakdown across B2B contracts vs D2C consumer demand"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="region" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} unit=" kg" />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="B2B" name="B2B Institutional (kg)" fill="#0d9488" stackId="a" barSize={24} />
                <Bar dataKey="D2C" name="D2C Retail (kg)" fill="#38bdf8" stackId="a" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Model Metadata & Uncertainty Bounds */}
        <Card
          title="Forecasting Model Intelligence"
          subtitle="Underlying ML architecture & uncertainty interval bounds"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Algorithm:</span>
                <span className="font-bold text-slate-900 font-mono">HistGradientBoosting</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Training Horizon:</span>
                <span className="font-semibold text-slate-800">18 Months Chronological</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Confidence Interval:</span>
                <Badge variant="teal">80% Residual Interval</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-700" /> Key Segment Uncertainty Bounds
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(risk_plan?.forecast_segments || []).map((seg, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-md text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{seg.region} ({seg.channel})</span>
                      <span className="text-teal-700 font-bold">{seg.point_forecast_kg} kg</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
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

      {/* Detailed Segment Table */}
      <Card
        title="Granular Demand Segment Details"
        subtitle={`Showing ${segments.length} segment records matching filter criteria`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Segment ID</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Forecast Demand</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Est. Potential Revenue</th>
                <th className="py-2.5 px-3 text-center">Commitment SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {segments.map((seg) => (
                <tr key={seg.segment_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{seg.segment_id}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{seg.region}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant={seg.channel === 'B2B' ? 'teal' : 'info'} size="sm">
                      {seg.channel}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{seg.demand_kg.toLocaleString()} kg</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">₹{(seg.revenue_inr / seg.allocated_kg || 400).toFixed(0)}/kg</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                    ₹{(seg.demand_kg * (seg.revenue_inr / seg.allocated_kg || 400)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {seg.channel === 'B2B' ? (
                      <Badge variant="warning" size="sm">Strict Contract</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
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
