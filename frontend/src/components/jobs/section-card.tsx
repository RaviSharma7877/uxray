"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function SectionCard({
  title,
  description,
  children,
  defaultCollapsed = false,
  collapsible = false,
  actions,
  className,
  headerClassName,
}: SectionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between p-6 border-b bg-muted/30',
          collapsible && 'cursor-pointer hover:bg-muted/50 transition-colors',
          headerClassName
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {collapsible && (
              <button
                className="rounded-full p-1 hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && !isCollapsed && (
          <div className="flex items-center gap-2 ml-4">
            {actions}
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
}
