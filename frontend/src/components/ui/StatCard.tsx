import React from 'react';
import { Badge } from './Badge';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'neutral';
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  change,
  changeType = 'neutral',
  subtitle,
  icon,
  badgeText,
  badgeVariant = 'neutral',
  highlight = false,
}) => {
  return (
    <div
      className={`tower-card p-5 relative overflow-hidden transition-all duration-200 ${
        highlight ? 'bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white border-teal-800' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-xs font-semibold tracking-wide uppercase ${highlight ? 'text-teal-200/90' : 'text-slate-500'}`}>
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${highlight ? 'bg-teal-800/50 text-teal-300' : 'bg-slate-100 text-teal-700'}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-2xl lg:text-3xl font-bold font-display tracking-tight ${highlight ? 'text-white' : 'text-slate-900'}`}>
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </span>
        {unit && <span className={`text-sm font-medium ${highlight ? 'text-teal-200' : 'text-slate-500'}`}>{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {subtitle && (
          <span className={`text-xs ${highlight ? 'text-teal-200/80' : 'text-slate-500'}`}>{subtitle}</span>
        )}
        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        {change && (
          <span
            className={`text-xs font-semibold ${
              changeType === 'positive'
                ? 'text-emerald-600'
                : changeType === 'negative'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
};
