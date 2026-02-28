/**
 * D3.js Chart Theme Configuration
 * Provides consistent styling for all D3.js visualizations
 */

export const chartThemes = {
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    muted: '#71717a',
    mutedForeground: '#a1a1aa',
    border: '#27272a',
    primary: '#ffffff',
    secondary: '#3f3f46',
    accent: '#18181b',
    
    // Chart-specific colors
    colors: {
      primary: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
      success: ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'],
      warning: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
      danger: ['#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
      info: ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985'],
      purple: ['#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8'],
      gradient: [
        '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
        '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'
      ],
      heatmap: [
        '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa',
        '#93c5fd', '#dbeafe', '#fef3c7', '#fde047', '#facc15',
        '#f59e0b', '#f97316', '#ea580c', '#dc2626', '#991b1b'
      ]
    },
    
    // Typography
    fonts: {
      base: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
    },
    
    // Sizes
    fontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20
    },
    
    // Spacing
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32
    },
    
    // Animation
    animation: {
      duration: {
        fast: 150,
        normal: 300,
        slow: 500
      },
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  light: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    muted: '#a1a1aa',
    mutedForeground: '#71717a',
    border: '#e4e4e7',
    primary: '#18181b',
    secondary: '#f4f4f5',
    accent: '#fafafa',
    
    // Chart-specific colors
    colors: {
      primary: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
      success: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
      warning: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
      danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
      info: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
      purple: ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
      gradient: [
        '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
        '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'
      ],
      heatmap: [
        '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6',
        '#2563eb', '#fef3c7', '#fde047', '#facc15', '#f59e0b',
        '#f97316', '#ea580c', '#dc2626', '#b91c1c', '#991b1b'
      ]
    },
    
    // Typography
    fonts: {
      base: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
    },
    
    // Sizes
    fontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20
    },
    
    // Spacing
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32
    },
    
    // Animation
    animation: {
      duration: {
        fast: 150,
        normal: 300,
        slow: 500
      },
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

export type ChartTheme = typeof chartThemes.dark;
export type ThemeMode = 'dark' | 'light';

/**
 * Get theme based on current mode
 */
export function getChartTheme(mode: ThemeMode = 'dark'): ChartTheme {
  return chartThemes[mode];
}

/**
 * Get color scale for a specific category
 */
export function getColorScale(
  category: keyof ChartTheme['colors'],
  mode: ThemeMode = 'dark'
): string[] {
  return chartThemes[mode].colors[category];
}
