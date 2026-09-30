import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-[#E8EFE5] text-[#324C3A] border-[#718B6B]/40',
    warning: 'bg-[#FDF8EF] text-[#B47832] border-[#E8D5B7]',
    danger: 'bg-[#FDF2F2] text-[#9E3B3B] border-[#EAA8A8]',
    info: 'bg-[#F4F7F9] text-[#3B5B78] border-[#D0DCDE]',
    teal: 'bg-[#E8EFE5] text-[#324C3A] border-[#718B6B]/40 font-bold',
    neutral: 'bg-[#F7F7F2] text-[#64645F] border-[#DEDED8]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase',
    md: 'px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[2px] border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
