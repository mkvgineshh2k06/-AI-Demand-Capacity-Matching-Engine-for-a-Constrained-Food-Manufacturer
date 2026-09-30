import React from 'react';
import { Calendar, RefreshCw, Zap, Sliders, Shield } from 'lucide-react';
import { OptimizationStrategy, RiskMode } from '../../api/types';
import { Button } from '../ui/Button';

interface TopbarProps {
  targetPeriod: string;
  onChangePeriod: (period: string) => void;
  strategy: OptimizationStrategy;
  onChangeStrategy: (strategy: OptimizationStrategy) => void;
  riskMode: RiskMode;
  onChangeRiskMode: (riskMode: RiskMode) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onLoadDemoData?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  targetPeriod,
  onChangePeriod,
  strategy,
  onChangeStrategy,
  riskMode,
  onChangeRiskMode,
  onRefresh,
  isRefreshing = false,
  onLoadDemoData,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Target Period Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-lg border border-slate-200/70 text-xs font-medium text-slate-700">
          <Calendar className="w-4 h-4 text-teal-700" />
          <span className="text-slate-500">Planning Horizon:</span>
          <select
            value={targetPeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="2024-05">May 2024 (Q2)</option>
            <option value="2024-06">June 2024 (Q2)</option>
            <option value="2024-07">July 2024 (Q3)</option>
            <option value="2024-08">August 2024 (Q3)</option>
          </select>
        </div>
      </div>

      {/* Global Quick Actions & Controls */}
      <div className="flex items-center gap-3">
        {/* Strategy selector */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg text-xs border border-slate-200">
          <Sliders className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <span className="text-slate-500 mr-1 hidden sm:inline">Strategy:</span>
          {(['balanced', 'revenue', 'fulfillment'] as OptimizationStrategy[]).map((strat) => (
            <button
              key={strat}
              onClick={() => onChangeStrategy(strat)}
              className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                strategy === strat
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {strat}
            </button>
          ))}
        </div>

        {/* Risk mode selector */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg text-xs border border-slate-200 hidden md:flex">
          <Shield className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <span className="text-slate-500 mr-1">Risk:</span>
          {(['balanced', 'aggressive', 'safe'] as RiskMode[]).map((r) => (
            <button
              key={r}
              onClick={() => onChangeRiskMode(r)}
              className={`px-2 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                riskMode === r
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Re-Run Engine
        </Button>

        {/* Demo Data button */}
        {onLoadDemoData && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadDemoData}
            icon={<Zap className="w-3.5 h-3.5 text-teal-400" />}
          >
            Load Demo Data
          </Button>
        )}
      </div>
    </header>
  );
};
