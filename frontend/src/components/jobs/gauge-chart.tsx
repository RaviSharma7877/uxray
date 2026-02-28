"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'next-themes';
import { getChartTheme, type ThemeMode } from '@/lib/chart-themes';

interface GaugeChartProps {
  value: number; // 0-100
  label: string;
  size?: number;
  thickness?: number;
  showValue?: boolean;
}

export function GaugeChart({
  value,
  label,
  size = 120,
  thickness = 12,
  showValue = true,
}: GaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme: themeMode } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !isClient) return;

    const theme = getChartTheme((themeMode as ThemeMode) || 'dark');
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = size / 2;
    const innerRadius = radius - thickness;

    // Create gradient based on value
    const getColor = (val: number) => {
      if (val >= 90) return '#10b981'; // green
      if (val >= 50) return '#f59e0b'; // amber
      return '#ef4444'; // red
    };

    const color = getColor(value);

    // Background arc
    const backgroundArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle(2 * Math.PI);

    // Value arc
    const valueArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle((value / 100) * 2 * Math.PI);

    const g = svg
      .append('g')
      .attr('transform', `translate(${radius}, ${radius})`);

    // Draw background
    g.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', theme.muted)
      .attr('opacity', 0.2);

    // Draw value arc with animation
    const valuePath = g
      .append('path')
      .attr('fill', color)
      .attr('opacity', 0.9);

    valuePath
      .transition()
      .duration(theme.animation.duration.slow)
      .attrTween('d', function() {
        const interpolate = d3.interpolate(0, value / 100);
        return function(t) {
          const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .startAngle(0)
            .endAngle(interpolate(t) * 2 * Math.PI);
          return arc(null as any) || '';
        };
      });

    // Add value text
    if (showValue) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', `${size / 3.5}px`)
        .style('font-weight', 'bold')
        .style('fill', theme.foreground)
        .text(Math.round(value));
    }

  }, [value, size, thickness, showValue, themeMode, isClient]);

  if (!isClient) {
    return <div className="w-full h-full bg-muted animate-pulse rounded-full" style={{ width: size, height: size }} />;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="drop-shadow-sm"
      />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
