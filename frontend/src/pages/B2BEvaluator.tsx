import React, { useState } from 'react';
import { Users, UserPlus, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { OperationalPlan, B2BAccount, B2BEvaluationResponse } from '../api/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
      const availCap = summary?.usable_capacity_kg || 3950;
      const segs = plan?.allocation_plan?.segments || [];
      const res = await api.evaluateB2BAccount(
        new_account,
        availCap,
        segs,
        plan?.strategy || 'balanced'
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
    <div className="space-y-8 pb-12 font-sans max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="bg-white border border-[#DEDED8] rounded-[2px] p-8 space-y-4">
        <div className="text-[11px] font-bold tracking-widest text-[#64645F] uppercase font-mono">
          04 / B2B CONTRACT EVALUATOR
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#111111] tracking-tight">
          Feasibility check for new accounts.
        </h1>
        <p className="text-sm text-[#64645F] max-w-xl">
          Capacity-aware feasibility assessment and margin analysis for prospective B2B institutional client contracts.
        </p>
      </div>

      {/* Grid Layout: Input Form & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5">
          <Card
            title="PROSPECTIVE CLIENT CONTRACT"
            subtitle="Enter contract SLA parameters for real-time capacity validation"
          >
            <form onSubmit={handleEvaluate} className="space-y-4 pt-2 font-sans">
              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Customer Account Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DEDED8] bg-[#F7F7F2] rounded-[2px] text-xs font-semibold text-[#111111] focus:ring-1 focus:ring-[#324C3A] focus:outline-none"
                  placeholder="e.g. National Hypermarket Co"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Target Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEDED8] bg-[#F7F7F2] rounded-[2px] text-xs font-semibold text-[#111111] focus:ring-1 focus:ring-[#324C3A] focus:outline-none cursor-pointer"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Priority Tier</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#DEDED8] bg-[#F7F7F2] rounded-[2px] text-xs font-semibold text-[#111111] focus:ring-1 focus:ring-[#324C3A] focus:outline-none cursor-pointer"
                  >
                    <option value="HIGH">HIGH (Key Account)</option>
                    <option value="MEDIUM">MEDIUM (Standard)</option>
                    <option value="LOW">LOW (Secondary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Requirement (kg/mo)</label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="50"
                    required
                    value={requirementKg}
                    onChange={(e) => setRequirementKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DEDED8] bg-[#F7F7F2] rounded-[2px] text-xs font-mono font-bold text-[#111111] focus:ring-1 focus:ring-[#324C3A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Unit Price (₹/kg)</label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    required
                    value={unitPriceInr}
                    onChange={(e) => setUnitPriceInr(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DEDED8] bg-[#F7F7F2] rounded-[2px] text-xs font-mono font-bold text-[#111111] focus:ring-1 focus:ring-[#324C3A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">Minimum Contract SLA ({minFulfillmentPct}%)</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={minFulfillmentPct}
                  onChange={(e) => setMinFulfillmentPct(Number(e.target.value))}
                  className="w-full accent-[#324C3A] cursor-pointer"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isEvaluating}
                icon={<UserPlus className="w-4 h-4 text-white" />}
              >
                Evaluate Feasibility
              </Button>
            </form>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7">
          <Card
            title="EVALUATION RESULTS & FEASIBILITY"
            subtitle="Automated evaluation against available capacity and existing SLA obligations"
          >
            {result ? (
              <div className="space-y-6 pt-2 font-sans">
                {/* Feasibility Banner */}
                <div
                  className={`p-5 rounded-[2px] border flex items-center justify-between ${
                    result.feasibility === 'FEASIBLE'
                      ? 'bg-[#E8EFE5] border-[#718B6B]/40 text-[#324C3A]'
                      : result.feasibility === 'CONDITIONALLY_FEASIBLE'
                      ? 'bg-[#FFFBEB] border-[#F59E0B]/40 text-[#B45309]'
                      : 'bg-[#FDF2F2] border-[#EAA8A8] text-[#9E3B3B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.feasibility === 'FEASIBLE' ? (
                      <CheckCircle2 className="w-6 h-6 text-[#324C3A] shrink-0" />
                    ) : result.feasibility === 'CONDITIONALLY_FEASIBLE' ? (
                      <AlertTriangle className="w-6 h-6 text-[#B45309] shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-[#9E3B3B] shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                        STATUS: {result.feasibility.replace('_', ' ')}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">{result.explanation}</p>
                    </div>
                  </div>
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
                    <span className="text-[10px] text-[#64645F] font-bold uppercase tracking-wider font-sans">Requested Volume</span>
                    <div className="text-lg font-bold text-[#111111] mt-1">{result.requested_quantity_kg.toLocaleString()} kg</div>
                  </div>

                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
                    <span className="text-[10px] text-[#64645F] font-bold uppercase tracking-wider font-sans">Est. Revenue Impact</span>
                    <div className="text-lg font-bold text-[#324C3A] mt-1">₹{result.revenue_impact_inr.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="p-4 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px]">
                    <span className="text-[10px] text-[#64645F] font-bold uppercase tracking-wider font-sans">Capacity Deficit</span>
                    <div className="text-lg font-bold text-[#9E3B3B] mt-1">{result.capacity_deficit_kg.toLocaleString()} kg</div>
                  </div>
                </div>

                {/* Advice Action Block */}
                {result.minimum_additional_capacity_required_kg > 0 && (
                  <div className="p-5 bg-[#324C3A] text-white rounded-[2px] space-y-2">
                    <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-white" /> Recommended Action
                    </h4>
                    <p className="text-xs text-white/80 leading-relaxed font-sans">
                      Procure approximately <strong className="text-white font-mono font-bold">+{result.minimum_additional_capacity_required_kg} kg</strong> additional capacity via co-manufacturing before executing the contract SLA with {result.customer_name}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 font-sans">
                <Users className="w-8 h-8 text-[#DEDED8] mx-auto" />
                <div className="text-sm font-bold text-[#111111] uppercase tracking-wider">Ready for Evaluation</div>
                <p className="text-xs text-[#64645F] max-w-sm mx-auto">
                  Enter prospective client contract parameters on the left and click <strong>Evaluate Feasibility</strong>.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

