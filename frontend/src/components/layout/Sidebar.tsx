import React from 'react';
import {
  LayoutDashboard, TrendingUp, Layers, Sliders, Users,
  Target, ShieldAlert, Bot, FileText
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
  num: string;
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
    { id: 'overview', num: '01', label: 'Executive Briefing', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'forecast', num: '02', label: 'Demand Forecast', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'allocation', num: '03', label: 'Capacity Allocation', icon: <Layers className="w-3.5 h-3.5" /> },
    {
      id: 'scenarios',
      num: '04',
      label: 'Scenario Lab',
      icon: <Sliders className="w-3.5 h-3.5" />,
      badge: 'Simulate',
      badgeVariant: 'teal',
    },
    { id: 'b2b', num: '05', label: 'B2B Evaluator', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'marketing', num: '06', label: 'Marketing ROI', icon: <Target className="w-3.5 h-3.5" /> },
    {
      id: 'risk',
      num: '07',
      label: 'Risk Planner',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      badge: hasShortage ? 'Risk' : undefined,
      badgeVariant: 'danger',
    },
    { id: 'copilot', num: '08', label: 'Operations Copilot', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'plan', num: '09', label: 'Execution Roadmap', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside className="w-64 bg-white text-[#111111] flex flex-col h-screen sticky top-0 border-r border-[#DEDED8] shrink-0 select-none font-sans z-30">
      {/* Official BioKraft Brand Header */}
      <div className="p-5 border-b border-[#DEDED8] space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-[#324C3A] rounded-[1px]" />
          <div>
            <div className="text-base font-bold tracking-tight text-[#111111]">BIOKRAFT</div>
            <div className="text-[10px] font-bold tracking-widest text-[#64645F] uppercase">
              Operations Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Main Numbered Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <div className="px-3 mb-2.5 text-[10px] uppercase font-bold tracking-widest text-[#64645F]">
          Platform Modules
        </div>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer group ${
                isActive
                  ? 'bg-[#324C3A] text-white'
                  : 'hover:bg-[#F7F7F2] text-[#64645F] hover:text-[#111111]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#E8EFE5]' : 'text-[#64645F] group-hover:text-[#111111]'}`}>
                  {item.num}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-[#E8EFE5] text-[#324C3A]'
                      : item.badgeVariant === 'danger'
                      ? 'bg-[#FDF2F2] text-[#9E3B3B] border border-[#EAA8A8]'
                      : 'bg-[#E8EFE5] text-[#324C3A] border border-[#718B6B]/40'
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
      <div className="p-4 m-3 bg-[#F7F7F2] border border-[#DEDED8] rounded-[2px] space-y-2 text-xs">
        <div className="flex items-center justify-between text-[#111111]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64645F]">Engine API</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-[#718B6B]' : 'bg-[#9E3B3B]'
              }`}
            />
            <span className={`text-[10px] font-mono font-bold ${isBackendConnected ? 'text-[#324C3A]' : 'text-[#9E3B3B]'}`}>
              {isBackendConnected ? 'GROUNDED' : 'DEMO MODE'}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-[#64645F] flex justify-between pt-2 border-t border-[#DEDED8]">
          <span>Optimizer:</span>
          <span className="text-[#111111] font-bold">OR-Tools + GBR</span>
        </div>
      </div>
    </aside>
  );
};



