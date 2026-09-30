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
    <div className={`tower-card p-5 ${active ? 'ring-2 ring-teal-500/40 border-teal-500' : ''} ${className}`}>
      {(title || action || subtitle) && (
        <div className={`flex items-center justify-between mb-4 pb-3 border-b border-slate-100 ${headerClassName}`}>
          <div>
            {title && typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
