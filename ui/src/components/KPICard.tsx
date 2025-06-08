import React from 'react';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: number | string;
  badge?: {
    text: string;
    type: 'success' | 'warning' | 'info';
  };
  className?: string;
}

export function KPICard({ title, value, badge, className }: KPICardProps) {
  return (
    <div className={clsx(
      'bg-white rounded-card p-6 shadow-sm border border-gray-200',
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        
        {badge && (
          <span className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            {
              'bg-success-500/10 text-success-500': badge.type === 'success',
              'bg-warning-500/10 text-warning-500': badge.type === 'warning',
              'bg-blue-100 text-blue-800': badge.type === 'info',
            }
          )}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
} 