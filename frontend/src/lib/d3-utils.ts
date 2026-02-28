/**
 * D3.js Utility Functions
 * Helper functions for D3.js visualizations
 */

import * as d3 from 'd3';
import { ChartTheme } from './chart-themes';

/**
 * Create responsive SVG with proper viewBox
 */
export function createResponsiveSVG(
  container: HTMLElement,
  width: number,
  height: number,
  margin = { top: 20, right: 20, bottom: 40, left: 50 }
) {
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  return { svg, g, innerWidth, innerHeight, margin };
}

/**
 * Format number with K/M/B suffixes
 */
export function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format duration in seconds to readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

/**
 * Create tooltip element
 */
export function createTooltip(theme: ChartTheme) {
  return d3
    .select('body')
    .append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', theme.background)
    .style('color', theme.foreground)
    .style('border', `1px solid ${theme.border}`)
    .style('border-radius', '6px')
    .style('padding', '8px 12px')
    .style('font-size', `${theme.fontSize.sm}px`)
    .style('font-family', theme.fonts.base)
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)');
}

/**
 * Show tooltip at mouse position
 */
export function showTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
  content: string,
  event: MouseEvent
) {
  tooltip
    .html(content)
    .style('visibility', 'visible')
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY - 10}px`);
}

/**
 * Hide tooltip
 */
export function hideTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
) {
  tooltip.style('visibility', 'hidden');
}

/**
 * Export SVG to PNG
 */
export async function exportToPNG(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2
): Promise<void> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        resolve();
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Export SVG to SVG file
 */
export function exportToSVG(svgElement: SVGSVGElement, filename: string): void {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Wrap text to fit within a given width
 */
export function wrapText(
  text: d3.Selection<SVGTextElement, unknown, HTMLElement, unknown>,
  width: number
) {
  text.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy') || '0');
    let tspan = text
      .text(null)
      .append('tspan')
      .attr('x', 0)
      .attr('y', y)
      .attr('dy', `${dy}em`);

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      if ((tspan.node()?.getComputedTextLength() || 0) > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text
          .append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', `${++lineNumber * lineHeight + dy}em`)
          .text(word);
      }
    }
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get contrasting text color for background
 */
export function getContrastColor(backgroundColor: string): string {
  const color = d3.color(backgroundColor);
  if (!color) return '#000000';
  const rgb = color.rgb();
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Create linear gradient
 */
export function createLinearGradient(
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  id: string,
  colors: string[]
) {
  const gradient = svg
    .append('defs')
    .append('linearGradient')
    .attr('id', id)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  colors.forEach((color, i) => {
    gradient
      .append('stop')
      .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
      .attr('stop-color', color);
  });

  return gradient;
}

/**
 * Animate element entrance
 */
export function animateEntrance(
  selection: d3.Selection<any, any, any, any>,
  duration = 300
) {
  return selection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .style('opacity', 1);
}

/**
 * Animate value change
 */
export function animateValue(
  element: HTMLElement,
  start: number,
  end: number,
  duration = 1000,
  formatter: (value: number) => string = (v) => v.toFixed(0)
) {
  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = start + (end - start) * eased;
    element.textContent = formatter(current);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
}

/**
 * Debounce function for resize events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Calculate optimal number of ticks for axis
 */
export function calculateOptimalTicks(
  range: number,
  minTickSpacing = 50
): number {
  return Math.max(2, Math.floor(range / minTickSpacing));
}
