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
} from '@/lib/d3-utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface LineChartDataPoint {
  x: string | number | Date;
  y: number;
}

export interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
}

interface LineChartProps {
  series: LineChartSeries[];
  title?: string;
  height?: number;
  showExport?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

export function LineChart({
  series,
  title,
  height = 400,
  showExport = true,
  xAxisLabel,
  yAxisLabel,
  showLegend = true,
  showGrid = true,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { theme: themeMode } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient || series.length === 0) return;

    const theme = getChartTheme((themeMode as ThemeMode) || 'dark');
    const container = containerRef.current;
    
    // Clear previous chart
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };

    const { svg, g, innerWidth, innerHeight } = createResponsiveSVG(
      container,
      width,
      height,
      margin
    );

    svgRef.current = svg.node();

    // Flatten all data points
    const allData = series.flatMap((s) => s.data);

    // Determine if x-axis is temporal
    const isTimeSeries = allData.length > 0 && allData[0].x instanceof Date;

    // Create scales
    let xScale: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number> | d3.ScalePoint<string>;
    
    if (isTimeSeries) {
      xScale = d3
        .scaleTime()
        .domain(d3.extent(allData, (d) => d.x as Date) as [Date, Date])
        .range([0, innerWidth]);
    } else if (typeof allData[0]?.x === 'number') {
      xScale = d3
        .scaleLinear()
        .domain(d3.extent(allData, (d) => d.x as number) as [number, number])
        .range([0, innerWidth]);
    } else {
      xScale = d3
        .scalePoint()
        .domain(allData.map((d) => String(d.x)))
        .range([0, innerWidth])
        .padding(0.5);
    }

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(allData, (d) => d.y) || 0])
      .nice()
      .range([innerHeight, 0]);

    // Create axes
    const xAxis = isTimeSeries
      ? d3.axisBottom(xScale as d3.ScaleTime<number, number>).ticks(6)
      : d3.axisBottom(xScale as any);
    
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => formatNumber(d as number));

    // Add grid lines
    if (showGrid) {
      g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(
          d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('.domain')
        .remove();
    }

    // Add axes
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

    // Style axes
    g.selectAll('.domain, .tick line')
      .style('stroke', theme.border);

    // Add axis labels
    if (xAxisLabel) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`)
        .text(xAxisLabel);
    }

    if (yAxisLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('fill', theme.mutedForeground)
        .style('font-size', `${theme.fontSize.sm}px`)
        .text(yAxisLabel);
    }

    // Create tooltip
    const tooltip = createTooltip(theme);

    // Color scale
    const colorScale = d3.scaleOrdinal(theme.colors.gradient);

    // Create line generator
    const line = d3
      .line<LineChartDataPoint>()
      .x((d) => {
        if (isTimeSeries) {
          return (xScale as d3.ScaleTime<number, number>)(d.x as Date);
        } else if (typeof d.x === 'number') {
          return (xScale as d3.ScaleLinear<number, number>)(d.x);
        } else {
          return (xScale as d3.ScalePoint<string>)(String(d.x)) || 0;
        }
      })
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Draw lines
    series.forEach((s, i) => {
      const path = g
        .append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', s.color || colorScale(i.toString()))
        .attr('stroke-width', 2)
        .attr('d', line);

      // Animate line drawing
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(theme.animation.duration.slow * 2)
        .attr('stroke-dashoffset', 0);

      // Add dots
      g.selectAll(`.dot-${i}`)
        .data(s.data)
        .enter()
        .append('circle')
        .attr('class', `dot-${i}`)
        .attr('cx', (d) => {
          if (isTimeSeries) {
            return (xScale as d3.ScaleTime<number, number>)(d.x as Date);
          } else if (typeof d.x === 'number') {
            return (xScale as d3.ScaleLinear<number, number>)(d.x);
          } else {
            return (xScale as d3.ScalePoint<string>)(String(d.x)) || 0;
          }
        })
        .attr('cy', (d) => yScale(d.y))
        .attr('r', 0)
        .attr('fill', s.color || colorScale(i.toString()))
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('r', 6);
          showTooltip(
            tooltip,
            `<strong>${s.name}</strong><br/>${String(d.x)}: ${formatNumber(d.y)}`,
            event
          );
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 4);
          hideTooltip(tooltip);
        })
        .transition()
        .delay((d, idx) => idx * 50)
        .duration(theme.animation.duration.normal)
        .attr('r', 4);
    });

    // Add legend
    if (showLegend && series.length > 1) {
      const legend = g
        .append('g')
        .attr('transform', `translate(${innerWidth - 100}, 0)`);

      series.forEach((s, i) => {
        const legendRow = legend
          .append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow
          .append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', s.color || colorScale(i.toString()))
          .attr('rx', 2);

        legendRow
          .append('text')
          .attr('x', 18)
          .attr('y', 10)
          .style('fill', theme.foreground)
          .style('font-size', `${theme.fontSize.sm}px`)
          .text(s.name);
      });
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [series, themeMode, isClient, height, showLegend, showGrid, xAxisLabel, yAxisLabel]);

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
