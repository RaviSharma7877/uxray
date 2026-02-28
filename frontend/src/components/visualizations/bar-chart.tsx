"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'next-themes';
import { getChartTheme, type ThemeMode } from '@/lib/chart-themes';
import {
  createResponsiveSVG,
  createTooltip,
  showTooltip,
  hideTooltip,
  formatNumber,
  exportToPNG,
  exportToSVG,
  debounce,
} from '@/lib/d3-utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  showExport?: boolean;
  orientation?: 'vertical' | 'horizontal';
  sortBy?: 'value' | 'label' | 'none';
  maxBars?: number;
}

export function BarChart({
  data,
  title,
  height = 400,
  showExport = true,
  orientation = 'vertical',
  sortBy = 'value',
  maxBars = 10,
}: BarChartProps) {
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

    // Sort and limit data
    let chartData = [...data];
    if (sortBy === 'value') {
      chartData.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'label') {
      chartData.sort((a, b) => a.label.localeCompare(b.label));
    }
    chartData = chartData.slice(0, maxBars);

    const width = container.clientWidth;
    const margin = orientation === 'vertical'
      ? { top: 20, right: 20, bottom: 60, left: 50 }
      : { top: 20, right: 50, bottom: 40, left: 150 };

    const { svg, g, innerWidth, innerHeight } = createResponsiveSVG(
      container,
      width,
      height,
      margin
    );

    svgRef.current = svg.node();

    // Create scales
    let xScale: d3.ScaleBand<string> | d3.ScaleLinear<number, number>;
    let yScale: d3.ScaleBand<string> | d3.ScaleLinear<number, number>;

    if (orientation === 'vertical') {
      xScale = d3
        .scaleBand()
        .domain(chartData.map((d) => d.label))
        .range([0, innerWidth])
        .padding(0.2);

      yScale = d3
        .scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.value) || 0])
        .nice()
        .range([innerHeight, 0]);
    } else {
      xScale = d3
        .scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.value) || 0])
        .nice()
        .range([0, innerWidth]);

      yScale = d3
        .scaleBand()
        .domain(chartData.map((d) => d.label))
        .range([0, innerHeight])
        .padding(0.2);
    }

    // Create axes
    if (orientation === 'vertical') {
      const xAxis = d3.axisBottom(xScale as d3.ScaleBand<string>);
      const yAxis = d3.axisLeft(yScale as d3.ScaleLinear<number, number>)
        .ticks(5)
        .tickFormat((d) => formatNumber(d as number));

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`);

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`);
    } else {
      const xAxis = d3.axisBottom(xScale as d3.ScaleLinear<number, number>)
        .ticks(5)
        .tickFormat((d) => formatNumber(d as number));
      const yAxis = d3.axisLeft(yScale as d3.ScaleBand<string>);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`);

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`);
    }

    // Style axes
    g.selectAll('.domain, .tick line')
      .style('stroke', theme.border);

    // Create tooltip
    const tooltip = createTooltip(theme);

    // Create bars
    const colorScale = d3.scaleOrdinal(theme.colors.primary);

    if (orientation === 'vertical') {
      g.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => (xScale as d3.ScaleBand<string>)(d.label) || 0)
        .attr('y', innerHeight)
        .attr('width', (xScale as d3.ScaleBand<string>).bandwidth())
        .attr('height', 0)
        .attr('fill', (d, i) => d.color || colorScale(i.toString()))
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 0.8);
          showTooltip(
            tooltip,
            `<strong>${d.label}</strong><br/>Value: ${formatNumber(d.value)}`,
            event
          );
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 1);
          hideTooltip(tooltip);
        })
        .transition()
        .duration(theme.animation.duration.slow)
        .attr('y', (d) => (yScale as d3.ScaleLinear<number, number>)(d.value))
        .attr('height', (d) => innerHeight - (yScale as d3.ScaleLinear<number, number>)(d.value));
    } else {
      g.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (d) => (yScale as d3.ScaleBand<string>)(d.label) || 0)
        .attr('width', 0)
        .attr('height', (yScale as d3.ScaleBand<string>).bandwidth())
        .attr('fill', (d, i) => d.color || colorScale(i.toString()))
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 0.8);
          showTooltip(
            tooltip,
            `<strong>${d.label}</strong><br/>Value: ${formatNumber(d.value)}`,
            event
          );
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 1);
          hideTooltip(tooltip);
        })
        .transition()
        .duration(theme.animation.duration.slow)
        .attr('width', (d) => (xScale as d3.ScaleLinear<number, number>)(d.value));
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data, themeMode, isClient, orientation, sortBy, maxBars, height]);

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
