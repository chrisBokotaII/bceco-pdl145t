import { useMemo } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface ChartSeriesMotion {
  isAnimationActive: boolean;
  animationBegin: number;
  animationDuration: number;
  animationEasing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

/**
 * Shared Recharts motion settings — richer entrance when motion is allowed,
 * instant paint when the user prefers reduced motion.
 */
export function useChartMotion() {
  const reduced = usePrefersReducedMotion();

  return useMemo(() => {
    const base = (begin: number, duration = 900): ChartSeriesMotion => ({
      isAnimationActive: !reduced,
      animationBegin: reduced ? 0 : begin,
      animationDuration: reduced ? 0 : duration,
      animationEasing: 'ease-out',
    });

    return {
      reduced,
      /** Force remount/re-animate when this key changes (filters, theme, …). */
      series: {
        primary: base(40, 950),
        secondary: base(140, 950),
        tertiary: base(240, 900),
        pie: base(60, 1100),
        linePrimary: base(80, 1200),
        lineSecondary: base(220, 1200),
      },
    };
  }, [reduced]);
}
