"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from 'next-themes';
import { getChartTheme, type ThemeMode } from '@/lib/chart-themes';
import {
  createTooltip,
  showTooltip,
  hideTooltip,
  exportToPNG,
  exportToSVG,
} from '@/lib/d3-utils';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface HeatmapDataPoint {
  x: number; // X coordinate (0-1 normalized or pixel)
  y: number; // Y coordinate (0-1 normalized or pixel)
  value: number; // Intensity value
  label?: string; // Optional label for tooltip
}

interface D3HeatmapProps {
  data: HeatmapDataPoint[];
  backgroundImage?: string; // URL to background screenshot
  title?: string;
  height?: number;
  showExport?: boolean;
  heatmapType?: 'click' | 'scroll' | 'attention' | 'rage';
  colorScheme?: 'hot' | 'cool' | 'viridis';
}

export function D3Heatmap({
  data,
  backgroundImage,
  title,
  height = 600,
  showExport = true,
  heatmapType = 'click',
  colorScheme = 'hot',
}: D3HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { theme: themeMode } = useTheme();
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const uniqueId = useId();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient || data.length === 0) return;

    const theme = getChartTheme((themeMode as ThemeMode) || 'dark');
    const container = containerRef.current;
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', theme.background);

    svgRef.current = svg.node();

    const g = svg.append('g');

    if (backgroundImage) {
      g.append('image')
        .attr('href', backgroundImage)
        .attr('width', width)
        .attr('height', height)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .attr('opacity', 0.85); // Increased from 0.55 for better content visibility
    }

    const defs = svg.append('defs');
    const blurId = `heat-blur-${uniqueId}`;
    const softBlurId = `heat-soft-blur-${uniqueId}`;

    const addBlur = (id: string, deviation: number) => {
      const filter = defs.append('filter')
        .attr('id', id)
        .attr('x', '-60%')
        .attr('y', '-60%')
        .attr('width', '220%')
        .attr('height', '220%');
      filter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', deviation);
    };

    addBlur(blurId, heatmapType === 'rage' ? 12 : 16); // Increased blur for softer appearance
    addBlur(softBlurId, heatmapType === 'rage' ? 7 : 10);

    const interpolators: Record<'hot' | 'cool' | 'viridis', (t: number) => string> = {
      hot: (t: number) =>
        d3.interpolateRgbBasis([
          '#0b1b3f',
          '#1f3b73',
          '#f2542d',
          '#f6ae2d',
          '#ffe8a3',
        ])(Math.pow(t, 0.92)),
      cool: (t: number) =>
        d3.interpolateRgbBasis([
          '#0b2d4d',
          '#1e4d5f',
          '#3ea8a7',
          '#9be7ff',
          '#d6f4ff',
        ])(Math.pow(t, 0.95)),
      viridis: (t: number) => d3.interpolateViridis(Math.pow(t, 0.95)),
    };

    const colorScale = d3
      .scaleSequential(interpolators[colorScheme] || interpolators.hot)
      .domain([0, 1]);

    const tooltip = createTooltip(theme);
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const normalizePosition = (value: number, dimension: number) => {
      if (!Number.isFinite(value)) return 0;
      return value > 1 ? Math.min(value, dimension) : value * dimension;
    };

    const normalizedData = data.map((d) => ({
      x: normalizePosition(d.x, width),
      y: normalizePosition(d.y, height),
      value: Number.isFinite(d.value) ? d.value : 0,
      label: d.label || 'Interaction',
    }));

    const heatmapGroup = g.append('g').attr('class', 'heatmap-points');

    if (heatmapType === 'click' || heatmapType === 'rage') {
      const contours = d3.contourDensity<typeof normalizedData[0]>()
        .x((d) => d.x)
        .y((d) => d.y)
        .weight((d) => Math.max(1, d.value))
        .size([width, height])
        .bandwidth(heatmapType === 'rage' ? 28 : 38)
        .thresholds(heatmapType === 'rage' ? 14 : 18)
        (normalizedData);

      const maxDensity = d3.max(contours, (d) => d.value) || 1;

      const heatLayer = heatmapGroup.append('g').attr('filter', `url(#${blurId})`);
      heatLayer
        .selectAll('path')
        .data(contours)
        .enter()
        .append('path')
        .attr('d', d3.geoPath())
        .attr('fill', (d) => colorScale(Math.pow(d.value / maxDensity, 0.92)))
        .attr('opacity', (d) => 0.08 + 0.22 * Math.pow(d.value / maxDensity, 0.85)) // Reduced from 0.2 + 0.55
        .style('mix-blend-mode', 'screen')
        .style('cursor', 'pointer')
        .on('mousemove', (event, d) => {
          const intensity = Math.max(0, Math.min(1, d.value / maxDensity));
          showTooltip(
            tooltip,
            `<strong>${heatmapType === 'rage' ? 'Rage' : 'Click'} hotspot</strong><br/>Relative intensity: ${(intensity * 100).toFixed(0)}%`,
            event as MouseEvent
          );
        })
        .on('mouseleave', () => hideTooltip(tooltip));

      const hotspotHighlights = normalizedData
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const glowGroup = heatmapGroup.append('g').attr('filter', `url(#${softBlurId})`);
      glowGroup
        .selectAll('circle')
        .data(hotspotHighlights)
        .enter()
        .append('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', (d, i) => 12 + i * 1.2)
        .attr('fill', (d, i) => {
          const color = colorScale(clamp01(d.value / (maxDensity || d.value || 1)));
          const gradientId = `hotspot-glow-${uniqueId}-${i}`;
          const gradient = defs.append('radialGradient').attr('id', gradientId);
          gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.5); // Reduced from 0.9
          gradient.append('stop').attr('offset', '45%').attr('stop-color', color).attr('stop-opacity', 0.25); // Reduced from 0.45
          gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
          return `url(#${gradientId})`;
        })
        .style('mix-blend-mode', 'screen')
        .style('opacity', 0.2); // Reduced from 0.45
    }

    if (heatmapType === 'scroll') {
      const bandCount = 30;
      const bandHeight = height / bandCount;
      const scrollData = d3.rollup(
        normalizedData,
        (v) => d3.mean(v, (d) => d.value) || 0,
        (d) => Math.floor(d.y / bandHeight)
      );

      const scrollArray = Array.from(scrollData, ([band, value]) => ({
        band,
        value,
      })).filter((d) => d.band >= 0 && d.band < bandCount);

      const maxScroll = d3.max(scrollArray, (d) => d.value) || 1;

      const scrollLayer = heatmapGroup.append('g').attr('filter', `url(#${softBlurId})`);
      scrollLayer
        .selectAll('rect')
        .data(scrollArray)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => d.band * bandHeight)
        .attr('width', width)
        .attr('height', bandHeight * 1.2)
        .attr('fill', (d) => colorScale(Math.pow(d.value / maxScroll, 0.9)))
        .attr('opacity', (d) => 0.08 + 0.18 * Math.pow(d.value / maxScroll, 0.7)) // Reduced from 0.18 + 0.42
        .style('mix-blend-mode', 'screen')
        .on('mousemove', (event, d) => {
          const depth = Math.min(100, ((d.band + 0.5) / bandCount) * 100);
          showTooltip(
            tooltip,
            `<strong>Scroll depth: ${depth.toFixed(0)}%</strong><br/>Engagement: ${d.value.toFixed(2)}`,
            event as MouseEvent
          );
        })
        .on('mouseleave', () => hideTooltip(tooltip));
    }

    if (heatmapType === 'attention') {
      const contours = d3.contourDensity<typeof normalizedData[0]>()
        .x((d) => d.x)
        .y((d) => d.y)
        .weight((d) => Math.max(1, d.value))
        .size([width, height])
        .bandwidth(42)
        .thresholds(16)
        (normalizedData);

      const maxDensity = d3.max(contours, (d) => d.value) || 1;

      const attentionLayer = heatmapGroup.append('g').attr('filter', `url(#${softBlurId})`);
      attentionLayer
        .selectAll('path')
        .data(contours)
        .enter()
        .append('path')
        .attr('d', d3.geoPath())
        .attr('fill', (d) => colorScale(Math.pow(d.value / maxDensity, 0.92)))
        .attr('opacity', (d) => 0.08 + 0.2 * Math.pow(d.value / maxDensity, 0.8)) // Reduced from 0.2 + 0.45
        .style('mix-blend-mode', 'screen')
        .style('cursor', 'pointer')
        .on('mousemove', (event, d) => {
          const intensity = Math.max(0, Math.min(1, d.value / maxDensity));
          showTooltip(
            tooltip,
            `<strong>Attention density</strong><br/>Relative level: ${(intensity * 100).toFixed(0)}%`,
            event as MouseEvent
          );
        })
        .on('mouseleave', () => hideTooltip(tooltip));
    }

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      tooltip.remove();
    };
  }, [data, backgroundImage, themeMode, isClient, height, heatmapType, colorScheme, uniqueId]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleExportPNG = async () => {
    if (svgRef.current) {
      await exportToPNG(svgRef.current, `${title || 'heatmap'}.png`);
    }
  };

  const handleExportSVG = () => {
    if (svgRef.current) {
      exportToSVG(svgRef.current, `${title || 'heatmap'}.svg`);
    }
  };

  if (!isClient) {
    return <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {title && <h3 className="text-lg font-medium">{title}</h3>}
        <div className="flex gap-2">
          <div className="flex gap-1 border border-border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-xs h-8 px-2"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-xs h-8 px-2"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="text-xs h-8 px-2"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          {showExport && (
            <>
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
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Zoom: {zoom.toFixed(1)}x | Type: {heatmapType} | Points: {data.length}
      </div>
      <div ref={containerRef} className="w-full border border-border rounded-lg overflow-hidden" style={{ height: `${height}px` }} />
    </div>
  );
}
