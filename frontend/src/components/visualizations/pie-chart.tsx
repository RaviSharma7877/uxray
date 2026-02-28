"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'next-themes';
import { getChartTheme, type ThemeMode } from '@/lib/chart-themes';
import {
  createTooltip,
  showTooltip,
  hideTooltip,
  formatNumber,
  formatPercent,
  exportToPNG,
  exportToSVG,
} from '@/lib/d3-utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface PieChartData {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  height?: number;
  showExport?: boolean;
  showLegend?: boolean;
  innerRadius?: number; // For donut chart (0 = pie, >0 = donut)
}

export function PieChart({
  data,
  title,
  height = 400,
  showExport = true,
  showLegend = true,
  innerRadius = 0,
}: PieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { theme: themeMode } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient || data.length === 0) return;

    const theme = getChartTheme((themeMode as ThemeMode) || 'dark');
    const container = containerRef.current;
    
    // Clear previous chart
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth;
    const radius = Math.min(width, height) / 2 - 40;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svgRef.current = svg.node();

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Calculate total
    const total = d3.sum(data, (d) => d.value);

    // Create color scale
    const colorScale = d3.scaleOrdinal(theme.colors.gradient);

    // Create pie layout
    const pie = d3
      .pie<PieChartData>()
      .value((d) => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3
      .arc<d3.PieArcDatum<PieChartData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcHover = d3
      .arc<d3.PieArcDatum<PieChartData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10);

    // Create tooltip
    const tooltip = createTooltip(theme);

    // Draw slices
    const slices = g
      .selectAll('.slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'slice');

    slices
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => d.data.color || colorScale(i.toString()))
      .attr('stroke', theme.background)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(theme.animation.duration.fast)
          .attr('d', arcHover);
        
        const percentage = (d.data.value / total) * 100;
        showTooltip(
          tooltip,
          `<strong>${d.data.label}</strong><br/>Value: ${formatNumber(d.data.value)}<br/>Percentage: ${percentage.toFixed(1)}%`,
          event
        );
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(theme.animation.duration.fast)
          .attr('d', arc);
        hideTooltip(tooltip);
      })
      .transition()
      .duration(theme.animation.duration.slow)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t)) || '';
        };
      });

    // Add labels for larger slices
    slices
      .append('text')
      .attr('transform', (d) => {
        const [x, y] = arc.centroid(d);
        return `translate(${x},${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', theme.background)
      .style('font-size', `${theme.fontSize.sm}px`)
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .text((d) => {
        const percentage = (d.data.value / total) * 100;
        return percentage > 5 ? `${percentage.toFixed(0)}%` : '';
      })
      .transition()
      .delay(theme.animation.duration.slow)
      .duration(theme.animation.duration.normal)
      .style('opacity', 1);

    // Add legend
    if (showLegend) {
      const legendWidth = 150;
      const legendX = width / 2 + radius + 20;
      const legendY = -height / 2 + 20;

      const legend = svg
        .append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      const legendItems = legend
        .selectAll('.legend-item')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`);

      legendItems
        .append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('rx', 3)
        .attr('fill', (d, i) => d.color || colorScale(i.toString()));

      legendItems
        .append('text')
        .attr('x', 22)
        .attr('y', 12)
        .style('fill', theme.foreground)
        .style('font-size', `${theme.fontSize.sm}px`)
        .text((d) => {
          const percentage = (d.value / total) * 100;
          return `${d.label} (${percentage.toFixed(1)}%)`;
        });
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data, themeMode, isClient, height, innerRadius, showLegend]);

  const handleExportPNG = async () => {
    if (svgRef.current) {
      await exportToPNG(svgRef.current, `${title || 'chart'}.png`);
    }
  };

  const handleExportSVG = () => {
    if (svgRef.current) {
      exportToSVG(svgRef.current, `${title || 'chart'}.svg`);
    }
  };

  if (!isClient) {
    return <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-2">
      {(title || showExport) && (
        <div className="flex items-center justify-between">
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {showExport && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSVG}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                SVG
              </Button>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}
