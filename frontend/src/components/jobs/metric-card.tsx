"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  valueClassName?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  className,
  valueClassName,
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <p className={cn('text-3xl font-bold tracking-tight', valueClassName)}>
            {value}
          </p>
          {change && (
            <p className={cn('text-sm mt-2', trendColors[trend])}>
              <span className="font-medium">
                {change.value > 0 ? '+' : ''}
                {change.value}%
              </span>
              {' '}
              <span className="text-muted-foreground">{change.label}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
