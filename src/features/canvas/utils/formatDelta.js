/**
 * Compute the compare-mode delta chip for a KPI value vs its
 * baseline (typically the origin column's value in the same
 * compare view).
 *
 * Returns:
 *   {
 *     text: '+12%' | '-8%' | '0%' | '—',
 *     sign: 'better' | 'worse' | 'neutral',
 *     pct:  number | null,        // raw signed % for sorting / a11y
 *   }
 *
 * Sign rules — the chip is "better" when the change moves in the
 * KPI's preferred direction:
 *
 *   ┌─────────────────┬──────────────┬──────────────┐
 *   │ better_direction│  Δ < 0       │  Δ > 0       │
 *   ├─────────────────┼──────────────┼──────────────┤
 *   │ lower           │ better       │ worse        │
 *   │ higher          │ worse        │ better       │
 *   │ neutral         │ neutral      │ neutral      │
 *   └─────────────────┴──────────────┴──────────────┘
 *
 * A zero delta is always neutral regardless of direction.
 *
 * Inputs that don't yield a meaningful delta (missing value or
 * baseline, zero baseline, identical to baseline within rounding)
 * return the placeholder shape ({ text: '—', sign: 'neutral',
 * pct: null }) so consumers can skip-render without branching.
 */

const PLACEHOLDER = { text: '—', sign: 'neutral', pct: null };

const isMissing = (n) =>
  n === null ||
  n === undefined ||
  (typeof n === 'number' && !Number.isFinite(n));

export const formatDelta = (value, baseline, betterDirection = 'neutral') => {
  if (isMissing(value) || isMissing(baseline)) return PLACEHOLDER;
  if (baseline === 0) return PLACEHOLDER;

  const pct = ((value - baseline) / baseline) * 100;

  // Treat sub-0.05% drift as "no change" — avoids the chip flickering
  // through "+0.0%" between cache writes when the underlying value
  // is effectively unchanged.
  if (Math.abs(pct) < 0.05) {
    return { text: '0%', sign: 'neutral', pct: 0 };
  }

  let sign;
  if (betterDirection === 'lower') {
    sign = pct < 0 ? 'better' : 'worse';
  } else if (betterDirection === 'higher') {
    sign = pct > 0 ? 'better' : 'worse';
  } else {
    sign = 'neutral';
  }

  const decimals = Math.abs(pct) >= 10 ? 0 : 1;
  const formatted = pct.toFixed(decimals);
  // Show explicit sign so '+12%' reads obviously different from '12%'.
  const text = pct > 0 ? `+${formatted}%` : `${formatted}%`;

  return { text, sign, pct };
};
