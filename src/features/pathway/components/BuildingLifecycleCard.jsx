import { useEffect, useRef, useState } from 'react';
import { Typography } from 'antd';
import InfoTooltip from 'components/InfoTooltip';
import { getTickStep } from '../constants';

const { Title } = Typography;

const NODE_SIZE = 12;
const ONGOING_HEIGHT = 24;
const AXIS_WIDTH = 40;
const NAME_ROW_HEIGHT = 20;
// Minimum pxPerYear so nodes don't collapse on top of each other
const MIN_PX_PER_YEAR = 2;

const BuildingLifecycleCard = ({
  buildingName,
  pathways,
  fixedStartYear,
  fixedEndYear,
}) => {
  const contentRef = useRef(null);
  const [availableHeight, setAvailableHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailableHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!buildingName || !pathways?.length) return null;

  // Collect all years across all pathways for unified scale
  let minYear = fixedStartYear ?? Infinity;
  let maxYear = fixedEndYear ?? -Infinity;
  let anyOngoing = false;

  const pathwayData = pathways.map((pw) => {
    const intervals = (pw.intervals ?? []).map((i) => [i.start, i.end]);
    const events = [];
    for (const [start, end] of intervals) {
      events.push({ year: start, type: 'construct' });
      if (end != null) {
        events.push({ year: end, type: 'demolish' });
      }
    }
    events.sort((a, b) => a.year - b.year);

    let constructCount = 0;
    for (const e of events) {
      if (e.type === 'construct') {
        constructCount++;
        e.constructIndex = constructCount;
      }
      if (fixedStartYear == null && e.year < minYear) minYear = e.year;
      if (fixedEndYear == null && e.year > maxYear) maxYear = e.year;
    }

    const lastInterval = intervals[intervals.length - 1];
    const ongoing = lastInterval && lastInterval[1] == null;
    if (ongoing) anyOngoing = true;

    return { pathwayName: pw.pathway_name, intervals, events, ongoing };
  });

  if (minYear === Infinity) return null;

  const hasFixedScale = fixedStartYear != null && fixedEndYear != null;
  const yearPadding = hasFixedScale
    ? 2
    : Math.max(Math.ceil((maxYear - minYear) * 0.1), 5);
  const scaleMinYear = minYear - yearPadding;
  const scaleMaxYear = maxYear + yearPadding;
  const yearRange = scaleMaxYear - scaleMinYear;

  // Always reserve ongoing space when using fixed scale for consistent height
  const showOngoing = hasFixedScale ? true : anyOngoing;

  // Derive pxPerYear from available container height so everything fits
  // without scrolling. Falls back to MIN_PX_PER_YEAR on first render before
  // ResizeObserver has fired.
  const svgHeight = Math.max(
    availableHeight,
    yearRange * MIN_PX_PER_YEAR + ONGOING_HEIGHT + NAME_ROW_HEIGHT,
  );
  const totalHeight = svgHeight - NAME_ROW_HEIGHT;
  const contentHeight = totalHeight - (showOngoing ? ONGOING_HEIGHT : 0);
  const pxPerYear =
    yearRange > 0
      ? Math.max(contentHeight / yearRange, MIN_PX_PER_YEAR)
      : MIN_PX_PER_YEAR;

  const tickStep = getTickStep(pxPerYear);

  // Year to Y position (top = latest, bottom = earliest)
  const yearToY = (year) =>
    (showOngoing ? ONGOING_HEIGHT : 0) +
    ((scaleMaxYear - year) / yearRange) * contentHeight;

  const cx = NODE_SIZE / 2;

  const ticks = [];
  const firstTick = Math.ceil(scaleMinYear / tickStep) * tickStep;
  for (let y = firstTick; y <= scaleMaxYear; y += tickStep) {
    ticks.push(y);
  }

  const colWidth = 100;
  const scrollWidth = pathwayData.length * colWidth;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '16px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          marginBottom: 12,
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0,
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          {buildingName}
        </Title>
        <InfoTooltip tooltipKey="building-lifecycle" />
      </div>

      {/* Timeline area — fills remaining height, measured for scaling */}
      <div ref={contentRef} style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Scrollable pathway columns */}
        <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          <svg
            width={Math.max(scrollWidth, 100)}
            height={svgHeight}
            style={{ display: 'block' }}
          >
            {/* Separator above pathway name row */}
            <line
              x1={0}
              y1={totalHeight + 2}
              x2={Math.max(scrollWidth, 100)}
              y2={totalHeight + 2}
              stroke="#e0e0e0"
              strokeWidth={1}
            />

            {pathwayData.map((pd, colIdx) => {
              const offsetX = colIdx * colWidth + cx;

              return (
                <g key={pd.pathwayName}>
                  {/* Pathway name */}
                  <text
                    x={offsetX}
                    y={totalHeight + 16}
                    fontSize={11}
                    fontWeight="bold"
                    fill="#0F172A"
                  >
                    {pd.pathwayName}
                  </text>

                  {/* Ongoing line */}
                  {pd.ongoing && pd.events.length > 0 && (
                    <>
                      <line
                        x1={offsetX}
                        y1={0}
                        x2={offsetX}
                        y2={yearToY(pd.events[pd.events.length - 1].year)}
                        stroke="#000"
                        strokeWidth={1}
                      />
                      <text x={offsetX + 8} y={10} fontSize={11} fill="#94A3B8">
                        ongoing
                      </text>
                    </>
                  )}

                  {/* Dashed line from earliest event down to bottom */}
                  {pd.events.length > 0 && (
                    <line
                      x1={offsetX}
                      y1={yearToY(pd.events[0].year)}
                      x2={offsetX}
                      y2={totalHeight + 5}
                      stroke="#999"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Lines between consecutive events */}
                  {pd.events.map((e, i) => {
                    if (i >= pd.events.length - 1) return null;
                    const next = pd.events[i + 1];
                    const isDashed =
                      e.type === 'demolish' && next.type === 'construct';
                    return (
                      <line
                        key={`line-${colIdx}-${i}`}
                        x1={offsetX}
                        y1={yearToY(e.year)}
                        x2={offsetX}
                        y2={yearToY(next.year)}
                        stroke={isDashed ? '#999' : '#000'}
                        strokeWidth={1}
                        strokeDasharray={isDashed ? '4 4' : 'none'}
                      />
                    );
                  })}

                  {/* Nodes */}
                  {pd.events.map((e) => {
                    const isConstruct = e.type === 'construct';
                    const y = yearToY(e.year);
                    const label = isConstruct
                      ? e.constructIndex > 1
                        ? `Rebuilt(${e.constructIndex - 1})`
                        : 'Constructed'
                      : 'Demolished';

                    return (
                      <g key={`node-${colIdx}-${e.year}-${e.type}`}>
                        <circle
                          cx={offsetX}
                          cy={y}
                          r={4}
                          fill={isConstruct ? '#000' : '#fff'}
                          stroke="#000"
                          strokeWidth={1}
                        />
                        <text
                          x={offsetX + NODE_SIZE / 2 + 6}
                          y={y - 4}
                          fontSize={11}
                          fontWeight="bold"
                          fill="#0F172A"
                        >
                          Y_{e.year}
                        </text>
                        <text
                          x={offsetX + NODE_SIZE / 2 + 6}
                          y={y + 9}
                          fontSize={11}
                          fill="#475569"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gap labels */}
                  {pd.events.map((e, i) => {
                    if (i >= pd.events.length - 1) return null;
                    const next = pd.events[i + 1];
                    if (!(e.type === 'demolish' && next.type === 'construct'))
                      return null;
                    const midY = (yearToY(e.year) + yearToY(next.year)) / 2;
                    return (
                      <text
                        key={`gap-${colIdx}-${i}`}
                        x={offsetX + NODE_SIZE / 2 + 6}
                        y={midY + 4}
                        fontSize={11}
                        fill="#999"
                      >
                        gap
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Fixed year axis */}
        <svg
          width={AXIS_WIDTH}
          height={svgHeight}
          style={{ display: 'block', flexShrink: 0 }}
        >
          {ticks.map((year) => {
            const y = yearToY(year);
            return (
              <g key={`tick-${year}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={6}
                  y2={y}
                  stroke="rgba(100, 116, 139, 0.32)"
                  strokeWidth={1}
                />
                <text x={10} y={y + 4} fontSize={11} fill="#64748B">
                  {year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default BuildingLifecycleCard;
