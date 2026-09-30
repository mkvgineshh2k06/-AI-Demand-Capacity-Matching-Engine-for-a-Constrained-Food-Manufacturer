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
    <header className="h-16 bg-white border-b border-[#DEDED8] px-6 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Target Planning Horizon Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#F7F7F2] px-3.5 py-1.5 rounded-[2px] border border-[#DEDED8] text-xs font-semibold text-[#111111]">
          <Calendar className="w-3.5 h-3.5 text-[#324C3A]" />
          <span className="text-[#64645F] uppercase text-[10px] font-bold tracking-wider">Planning Horizon:</span>
          <select
            value={targetPeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-transparent font-bold text-[#111111] focus:outline-none cursor-pointer"
          >
            <option value="2024-05">May 2024 (Q2)</option>
            <option value="2024-06">June 2024 (Q2)</option>
            <option value="2024-07">July 2024 (Q3)</option>
            <option value="2024-08">August 2024 (Q3)</option>
          </select>
        </div>
      </div>

      {/* Global Optimization Controls */}
      <div className="flex items-center gap-3">
        {/* Minimal Segmented Strategy Selector */}
        <div className="flex items-center gap-1 bg-[#F7F7F2] p-1 rounded-[2px] text-xs border border-[#DEDED8]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64645F] px-2 hidden sm:inline">Strategy:</span>
          {(['balanced', 'revenue', 'fulfillment'] as OptimizationStrategy[]).map((strat) => (
            <button
              key={strat}
              onClick={() => onChangeStrategy(strat)}
              className={`px-3 py-1 rounded-[2px] text-xs uppercase font-bold tracking-wider transition-all cursor-pointer ${
                strategy === strat
                  ? 'bg-[#324C3A] text-white'
                  : 'text-[#64645F] hover:text-[#111111] hover:bg-white'
              }`}
            >
              {strat}
            </button>
          ))}
        </div>

        {/* Minimal Risk Mode Selector */}
        <div className="flex items-center gap-1 bg-[#F7F7F2] p-1 rounded-[2px] text-xs border border-[#DEDED8] hidden md:flex">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64645F] px-2">Risk:</span>
          {(['balanced', 'aggressive', 'safe'] as RiskMode[]).map((r) => (
            <button
              key={r}
              onClick={() => onChangeRiskMode(r)}
              className={`px-2.5 py-1 rounded-[2px] text-xs uppercase font-bold tracking-wider transition-all cursor-pointer ${
                riskMode === r
                  ? 'bg-[#111111] text-white'
                  : 'text-[#64645F] hover:text-[#111111] hover:bg-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Re-Run Engine Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Run Engine
        </Button>

        {/* Load Demo Data Button */}
        {onLoadDemoData && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadDemoData}
            icon={<Zap className="w-3.5 h-3.5 text-[#718B6B]" />}
          >
            Demo Data
          </Button>
        )}
      </div>
    </header>
  );
};

