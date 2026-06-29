/**
 * Per-state-year sparkline for pathway-mode headline KPI cards.
 *
 * Pure SVG, no axes, no gridlines, no tooltip. The point of the
 * sparkline is to show a trend at a glance — for the actual value
 * the user reads the big number above. Year labels under each
 * data point are the only decoration.
 *
 *   <KpiSparkline
 *     points={[{ year: 2020, value: 78.4 }, { year: 2030, value: 60.2 }, …]}
 *     highlightYear={2030}   // optional — fills the dot for "this card's year"
 *     betterDirection="lower"
 *   />
 *
 * Values that are `null` (state-year ran but the KPI wasn't
 * available there) cause the polyline to break at that point —
 * the line is drawn as connected segments between consecutive
 * non-null values.
 *
 * Renders nothing when `points` is null / shorter than 2 entries
 * (a single point isn't a trend) or when no point has a value.
 *
 * Hidden in non-pathway scenarios — the caller (`FeatureCardKpi`)
 * gates rendering on `kpi.headline === true && comparisonSetup is
 * a pathway-mode shape`. This component just renders what it's
 * handed.
 */

import { useMemo } from 'react';

import { CEA_PURPLE } from 'constants/theme';

const HEIGHT = 60;
const TOP_PAD = 6;
const BOTTOM_PAD = 4;
const LINE_HEIGHT = HEIGHT - TOP_PAD - BOTTOM_PAD;
const LABEL_HEIGHT = 14;
const TOTAL_HEIGHT = HEIGHT + LABEL_HEIGHT;

const KpiSparkline = ({
  points,
  highlightYear,
  betterDirection = 'neutral',
}) => {
  const computed = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2) return null;
    const validValues = points
      .map((p) => p?.value)
      .filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (validValues.length === 0) return null;
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    // Pad the y-range a touch so points don't kiss the edges; if
    // every value is identical (flat line) drop to a fixed half-
    // height baseline so the line still renders.
    const span = max - min;
    const safeSpan = span > 0 ? span : 1;
    const projectY = (value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const normalised = (value - min) / safeSpan;
      // SVG y grows downward; map "high value" to "small y".
      return TOP_PAD + (1 - normalised) * LINE_HEIGHT;
    };
    return { min, max, span, projectY };
  }, [points]);

  if (!computed) return null;

  const n = points.length;
  // X spacing is even — the sparkline is per-state-year, not per-
  // calendar-year, so the dots line up regardless of pathway
  // start / end. Row width is whatever the parent gives us via
  // `viewBox` aspect; SVG scales to fit.
  const xFor = (i) => (i / (n - 1)) * 100;

  const dots = points.map((p, i) => {
    const y = computed.projectY(p?.value);
    if (y === null) return null;
    return {
      key: p.year,
      cx: xFor(i),
      cy: y,
      year: p.year,
      isHighlight: highlightYear != null && p.year === highlightYear,
      value: p.value,
    };
  });

  // Build polyline as a list of contiguous segments — break
  // wherever a null appears so the line doesn't lie about
  // missing data with a straight join across the gap.
  const segments = [];
  let current = [];
  points.forEach((p, i) => {
    const y = computed.projectY(p?.value);
    if (y == null) {
      if (current.length >= 2) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(i), y });
  });
  if (current.length >= 2) segments.push(current);

  // Colour the polyline per `betterDirection`: a clear visual
  // hint about whether the trend is desirable. Dropping over
  // time on a "lower better" KPI = green; rising on the same =
  // red. Neutral KPIs stay grey.
  const trendColour = trendColourFor(points, betterDirection);

  return (
    <svg
      viewBox={`0 0 100 ${TOTAL_HEIGHT}`}
      preserveAspectRatio="none"
      style={svgStyle}
      role="img"
      aria-label="Trend across pathway state years"
    >
      {/* Polyline segments */}
      {segments.map((seg, i) => (
        <polyline
          key={`seg-${i}`}
          points={seg.map((s) => `${s.x},${s.y}`).join(' ')}
          fill="none"
          stroke={trendColour}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          // SVG strokes scale with the viewBox by default; this
          // keeps the line crisp regardless of the rendered card
          // width.
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* Dots — open circles for "other" years, filled for the
          highlighted year so the user can pick out "this is the
          card's state". */}
      {dots.filter(Boolean).map((d) => (
        <circle
          key={d.key}
          cx={d.cx}
          cy={d.cy}
          r={d.isHighlight ? 3 : 2}
          fill={d.isHighlight ? CEA_PURPLE : '#fff'}
          stroke={d.isHighlight ? CEA_PURPLE : trendColour}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${d.year}: ${d.value}`}</title>
        </circle>
      ))}
      {/* Year labels under each dot */}
      {points.map((p, i) => (
        <text
          key={`label-${p.year}`}
          x={xFor(i)}
          y={HEIGHT + LABEL_HEIGHT - 2}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          fontSize="8"
          fill={
            highlightYear != null && p.year === highlightYear ? '#222' : '#888'
          }
          // Text doesn't scale with viewBox the way strokes do —
          // declare the font-size in viewBox units so the
          // rendered text stays at a sensible pixel size at
          // typical card widths (~210 px). At ~3:1 aspect the
          // 8px viewBox font lands around 11 px on screen.
          style={{ fontFamily: 'inherit' }}
        >
          {`Y_${p.year}`}
        </text>
      ))}
    </svg>
  );
};

// Crude "is the trend going in the right direction" check —
// compare the first valid value to the last. Doesn't handle
// non-monotonic curves; the sparkline already shows the user
// the full shape, this is just the line colour.
const trendColourFor = (points, betterDirection) => {
  if (betterDirection === 'neutral') return '#888';
  const valid = points
    .map((p) => p?.value)
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length < 2) return '#888';
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first === last) return '#888';
  const wentDown = last < first;
  const isGood =
    (betterDirection === 'lower' && wentDown) ||
    (betterDirection === 'higher' && !wentDown);
  return isGood ? '#137333' : '#c5221f';
};

const svgStyle = {
  width: '100%',
  height: TOTAL_HEIGHT,
  display: 'block',
  marginTop: 6,
  overflow: 'visible',
};

export default KpiSparkline;
