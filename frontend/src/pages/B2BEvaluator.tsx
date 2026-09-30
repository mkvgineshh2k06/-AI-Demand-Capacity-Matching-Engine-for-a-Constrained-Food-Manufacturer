import React, { useState } from 'react';
import { Users, UserPlus, CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { OperationalPlan, B2BAccount, B2BEvaluationResponse } from '../api/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';

interface B2BEvaluatorProps {
  plan: OperationalPlan;
}

export const B2BEvaluator: React.FC<B2BEvaluatorProps> = ({ plan }) => {
  const { summary } = plan;

  // Form state
  const [customerName, setCustomerName] = useState<string>('National Hypermarket Co');
  const [region, setRegion] = useState<string>('Mumbai');
  const [requirementKg, setRequirementKg] = useState<number>(650);
  const [unitPriceInr, setUnitPriceInr] = useState<number>(420);
  const [minFulfillmentPct, setMinFulfillmentPct] = useState<number>(90);
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<B2BEvaluationResponse | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);

    const new_account: B2BAccount = {
      customer_name: customerName,
      region,
      monthly_requirement_kg: requirementKg,
      unit_price_inr: unitPriceInr,
      minimum_fulfillment_pct: minFulfillmentPct,
      priority,
    };

    try {
      const res = await api.evaluateB2BAccount(
        new_account,
        summary.usable_capacity_kg,
        plan.allocation_plan.segments || [],
        plan.strategy
      );
      setResult(res);
    } catch {
      // Deterministic fallback calculation
      const availCap = summary.usable_capacity_kg;
      const currentDemand = summary.forecast_demand_kg;
      const totalNewDemand = currentDemand + requirementKg;
      const deficit = Math.max(0, totalNewDemand - availCap);

      let feasibility: 'FEASIBLE' | 'CONDITIONALLY_FEASIBLE' | 'NOT_FEASIBLE' = 'FEASIBLE';
      if (deficit > 0 && deficit <= 500) {
        feasibility = 'CONDITIONALLY_FEASIBLE';
      } else if (deficit > 500) {
        feasibility = 'NOT_FEASIBLE';
      }

      const fallbackRes: B2BEvaluationResponse = {
        customer_name: customerName,
        feasibility,
        requested_quantity_kg: requirementKg,
        new_account_fulfillment_pct: deficit > 0 ? 75.0 : 100.0,
        existing_b2b_fulfillment_before_pct: summary.b2b_fulfillment_pct,
        existing_b2b_fulfillment_after_pct: Math.max(70, summary.b2b_fulfillment_pct - (deficit > 0 ? 8 : 0)),
        revenue_impact_inr: requirementKg * unitPriceInr,
        capacity_deficit_kg: deficit,
        minimum_additional_capacity_required_kg: deficit,
        explanation:
          feasibility === 'FEASIBLE'
            ? 'Sufficient spare capacity available to onboard this B2B client at 100% SLA.'
            : feasibility === 'CONDITIONALLY_FEASIBLE'
            ? `Onboarding causes a ${deficit} kg deficit. Activate co-manufacturing capacity of ${deficit} kg to proceed safely.`
            : 'Capacity shortfall is severe (>500 kg). Onboarding will breach existing high-priority client SLAs.',
      };

      setResult(fallbackRes);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-700" />
          B2B Customer Onboarding Evaluator
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Capacity-aware feasibility assessment for prospective B2B institutional accounts
        </p>
      </div>

      {/* Grid Layout: Input Form & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5">
          <Card
            title="Prospective Account Details"
            subtitle="Enter customer SLA contract parameters for capacity impact evaluation"
          >
            <form onSubmit={handleEvaluate} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. RetailCorp India"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority SLA</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="HIGH">HIGH (Key Account)</option>
                    <option value="MEDIUM">MEDIUM (Standard)</option>
                    <option value="LOW">LOW (Secondary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement (kg/mo)</label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="50"
                    required
                    value={requirementKg}
                    onChange={(e) => setRequirementKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (₹/kg)</label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    required
                    value={unitPriceInr}
                    onChange={(e) => setUnitPriceInr(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Minimum SLA ({minFulfillmentPct}%)</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={minFulfillmentPct}
                  onChange={(e) => setMinFulfillmentPct(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isEvaluating}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Evaluate Account Feasibility
              </Button>
            </form>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7">
          <Card
            title="Feasibility Analysis & Capacity Impact"
            subtitle="Automated evaluation against plant capacity limits and current client commitments"
          >
            {result ? (
              <div className="space-y-4 pt-1">
                {/* Feasibility Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    result.feasibility === 'FEASIBLE'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : result.feasibility === 'CONDITIONALLY_FEASIBLE'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.feasibility === 'FEASIBLE' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : result.feasibility === 'CONDITIONALLY_FEASIBLE' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide">
                        {result.feasibility.replace('_', ' ')}
                      </h3>
                      <p className="text-xs mt-0.5 opacity-90">{result.explanation}</p>
                    </div>
                  </div>
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Requested Volume</span>
                    <div className="text-lg font-bold text-slate-900 font-display mt-1">{result.requested_quantity_kg.toLocaleString()} kg</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Est. Revenue Impact</span>
                    <div className="text-lg font-bold text-emerald-700 font-display mt-1">₹{result.revenue_impact_inr.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Projected Capacity Deficit</span>
                    <div className="text-lg font-bold text-rose-600 font-display mt-1">{result.capacity_deficit_kg.toLocaleString()} kg</div>
                  </div>
                </div>

                {/* Actionable Advice if Conditionally Feasible */}
                {result.minimum_additional_capacity_required_kg > 0 && (
                  <div className="p-4 bg-teal-900 text-white rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-300" /> Action Required to Onboard Account
                    </h4>
                    <p className="text-xs text-teal-100/90 leading-relaxed">
                      Add approximately <strong className="text-white underline">+{result.minimum_additional_capacity_required_kg} kg</strong> extra capacity via co-manufacturing before confirming SLA contract with {result.customer_name}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">Ready for Evaluation</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Enter prospective client parameters on the left and click <strong>Evaluate Account Feasibility</strong>.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
