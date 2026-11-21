import { useMemo, type CSSProperties } from 'react';
import { useTheme } from '../context/ThemeContext';

export interface ChartTheme {
  grid: string;
  tick: string;
  muted: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  navy: string;
  blue: string;
  success: string;
  warning: string;
  error: string;
  legend: CSSProperties;
  tooltip: CSSProperties;
}

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Recharts strokes/fills bound to design tokens (updates with theme). */
export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();

  return useMemo(() => {
    const grid = readCssVar('--chart-grid', resolved === 'dark' ? '#293548' : '#E2E8F0');
    const tick = readCssVar('--chart-tick', resolved === 'dark' ? '#CBD5E1' : '#334155');
    const muted = readCssVar('--chart-muted', resolved === 'dark' ? '#A0AEC0' : '#475569');
    const tooltipBg = readCssVar('--chart-tooltip-bg', resolved === 'dark' ? '#151E2E' : '#FFFFFF');
    const tooltipBorder = readCssVar(
      '--chart-tooltip-border',
      resolved === 'dark' ? '#293548' : '#CBD5E1'
    );
    const tooltipText = readCssVar(
      '--chart-tooltip-text',
      resolved === 'dark' ? '#F1F5F9' : '#0F172A'
    );
    const navy = readCssVar('--chart-navy', resolved === 'dark' ? '#93C5FD' : '#0F2544');
    const blue = readCssVar('--chart-blue', resolved === 'dark' ? '#3B82F6' : '#1D4ED8');
    const success = readCssVar('--chart-success', resolved === 'dark' ? '#34D399' : '#15803D');
    const warning = readCssVar('--chart-warning', resolved === 'dark' ? '#FBBF24' : '#D97706');
    const error = readCssVar('--chart-error', resolved === 'dark' ? '#F87171' : '#B91C1C');

    return {
      grid,
      tick,
      muted,
      tooltipBg,
      tooltipBorder,
      tooltipText,
      navy,
      blue,
      success,
      warning,
      error,
      legend: { fontSize: 12, color: muted },
      tooltip: {
        borderRadius: 6,
        borderColor: tooltipBorder,
        backgroundColor: tooltipBg,
        color: tooltipText,
        fontSize: 12,
      },
    };
  }, [resolved]);
}
