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
      className={`border rounded-[2px] p-6 relative overflow-hidden transition-all ${
        highlight
          ? 'bg-[#324C3A] text-white border-[#324C3A]'
          : 'bg-white border-[#DEDED8]'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-[11px] font-bold tracking-wider uppercase ${highlight ? 'text-[#E8EFE5]' : 'text-[#64645F]'}`}>
          {title}
        </span>
        {icon && (
          <div className={`p-1.5 rounded-[2px] ${highlight ? 'bg-[#263B2D] text-[#E8EFE5]' : 'bg-[#F7F7F2] text-[#324C3A]'}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={`text-3xl lg:text-4xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-[#111111]'}`}>
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </span>
        {unit && <span className={`text-sm font-medium ${highlight ? 'text-[#E8EFE5]' : 'text-[#64645F]'}`}>{unit}</span>}
      </div>

      <div className="mt-4 pt-3 border-t border-[#DEDED8]/60 flex items-center justify-between">
        {subtitle && (
          <span className={`text-xs ${highlight ? 'text-[#E8EFE5]/80' : 'text-[#64645F]'}`}>{subtitle}</span>
        )}
        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        {change && (
          <span
            className={`text-xs font-bold ${
              changeType === 'positive'
                ? 'text-[#718B6B]'
                : changeType === 'negative'
                ? 'text-[#9E3B3B]'
                : 'text-[#64645F]'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
};
