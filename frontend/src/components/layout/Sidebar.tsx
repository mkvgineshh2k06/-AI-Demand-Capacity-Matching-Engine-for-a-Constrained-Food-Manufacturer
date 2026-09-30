import React from 'react';
import {
  LayoutDashboard, TrendingUp, Layers, Sliders, Users,
  Target, ShieldAlert, Bot, FileText, Cpu, CheckCircle2, AlertTriangle
} from 'lucide-react';

export type ScreenId =
  | 'overview'
  | 'forecast'
  | 'allocation'
  | 'scenarios'
  | 'b2b'
  | 'marketing'
  | 'risk'
  | 'copilot'
  | 'plan';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  isBackendConnected: boolean;
  hasShortage?: boolean;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'danger' | 'warning' | 'teal';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  isBackendConnected,
  hasShortage = false,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Executive Control Tower', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'forecast', label: 'Demand Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'allocation', label: 'Capacity Allocation', icon: <Layers className="w-4 h-4" /> },
    {
      id: 'scenarios',
      label: 'Scenario Lab',
      icon: <Sliders className="w-4 h-4" />,
      badge: 'Interactive',
      badgeVariant: 'teal',
    },
    { id: 'b2b', label: 'B2B Account Evaluator', icon: <Users className="w-4 h-4" /> },
    { id: 'marketing', label: 'Marketing Intelligence', icon: <Target className="w-4 h-4" /> },
    {
      id: 'risk',
      label: 'Risk Planner',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: hasShortage ? 'Critical' : undefined,
      badgeVariant: 'danger',
    },
    { id: 'copilot', label: 'AI Operations Copilot', icon: <Bot className="w-4 h-4" /> },
    { id: 'plan', label: 'Final Action Plan', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold font-display shadow-md shadow-teal-500/20">
            <Cpu className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="text-sm font-bold text-white font-display tracking-tight leading-none">
              BioKraft Foods
            </div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-teal-400 mt-1">
              Decision Tower AI
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Core Operations
        </div>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-teal-700 text-white shadow-sm font-semibold'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    item.badgeVariant === 'danger'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status & System Info */}
      <div className="p-3 m-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Backend API</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className={isBackendConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {isBackendConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
          <span>Engine:</span>
          <span className="text-slate-300 font-mono">OR-Tools + GBR</span>
        </div>
      </div>
    </aside>
  );
};
