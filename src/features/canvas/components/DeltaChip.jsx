/**
 * Compare-mode delta indicator — a small pill rendered next to a
 * KPI value showing the percentage change vs the origin column's
 * baseline.
 *
 * Pure presentation. Computes nothing on its own; delegates to
 * `formatDelta` so the colour-vs-direction rules stay in one
 * place and can be unit-tested without React.
 *
 *   <DeltaChip
 *     value={78.4}
 *     baseline={85.2}
 *     betterDirection="lower"
 *     baselineLabel="Current"
 *   />
 *
 * Renders nothing (`null`) when the delta has no meaning
 * (missing value / baseline, zero baseline) so consumers don't
 * have to branch around it.
 */
import { formatDelta } from '../utils/formatDelta';

const DeltaChip = ({
  value,
  baseline,
  betterDirection = 'neutral',
  baselineLabel = 'Current',
}) => {
  const { text, sign, pct } = formatDelta(value, baseline, betterDirection);
  if (pct === null) return null;

  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
  const colour = SIGN_COLOURS[sign];

  // The "vs <baseline>" suffix used to render inline; it's now in
  // the `title` attribute (hover tooltip) so the chip stays
  // compact enough to fit beside the info icon on row 4. The
  // delta is implicitly relative to whatever baseline the
  // navigator's toggle names ("…against Current").
  return (
    <span
      style={{ ...chipStyle, color: colour }}
      title={`${text} vs ${baselineLabel}`}
    >
      <span style={arrowStyle} aria-hidden>
        {arrow}
      </span>
      {text}
    </span>
  );
};

const SIGN_COLOURS = {
  better: '#137333', // green 700 — clearly positive
  worse: '#c5221f', // red 700 — clearly negative
  neutral: '#666', // grey — no judgement
};

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.2,
};

const arrowStyle = {
  fontSize: 10,
};

export default DeltaChip;
