import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  active = false,
}) => {
  return (
    <div className={`bg-white border ${active ? 'border-[#324C3A] ring-1 ring-[#324C3A]' : 'border-[#DEDED8]'} rounded-[2px] p-6 transition-all ${className}`}>
      {(title || action || subtitle) && (
        <div className={`flex items-center justify-between mb-5 pb-3.5 border-b border-[#DEDED8] ${headerClassName}`}>
          <div>
            {title && typeof title === 'string' ? (
              <h3 className="text-sm font-bold tracking-tight text-[#111111] uppercase">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-[#64645F] mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
