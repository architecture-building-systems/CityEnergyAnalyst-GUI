// Shared pure helpers for the pathway feature.

import { STATUS_ACCENT, STATUS_FILL } from './constants';

/**
 * Returns the smallest label step (in years) that keeps tick labels at least
 * 56 px apart at the given pixels-per-year scale.
 * @param {number} pxPerYear
 * @returns {number}
 */
export const getTickStep = (pxPerYear) => {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const step of steps) {
    if (pxPerYear * step >= 56) return step;
  }
  return 1000;
};

export const getErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (detail?.message) {
    return detail.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
};

export const formatCompactTimestamp = (value) => {
  if (!value) {
    return 'Not recorded';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const pickClosestYear = (years, preferredYear) => {
  if (!years?.length || preferredYear == null) {
    return null;
  }

  return (
    [...years].sort(
      (left, right) =>
        Math.abs(left - preferredYear) - Math.abs(right - preferredYear) ||
        left - right,
    )[0] ?? null
  );
};

export const resolveSelectedYear = ({
  years,
  preferredYear,
  pendingYear,
  currentYear,
  rememberedYear,
}) => {
  const candidates = [preferredYear, pendingYear, currentYear, rememberedYear];

  for (const candidate of candidates) {
    if (candidate != null && years.includes(candidate)) {
      return candidate;
    }
  }

  const fallbackTarget =
    preferredYear ?? pendingYear ?? currentYear ?? rememberedYear ?? null;
  if (fallbackTarget != null) {
    return pickClosestYear(years, fallbackTarget);
  }

  return years[0] ?? null;
};

export const getNodeFill = (row) => {
  const hasStale = row?.status?.has_stale_phase;
  if (hasStale) return STATUS_ACCENT.error;
  const primaryPhase = row?.status?.primary_phase ?? 'none';
  return STATUS_FILL[primaryPhase] ?? STATUS_FILL.none;
};

export const getNodeSize = () => 12;
