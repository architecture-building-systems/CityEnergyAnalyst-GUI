import { Typography } from 'antd';
import InfoTooltip from 'components/InfoTooltip';

const { Text, Title } = Typography;

const NODE_SIZE = 12;
const PX_PER_YEAR = 8;
const MIN_HEIGHT = 200;
const ONGOING_HEIGHT = 24;
const AXIS_WIDTH = 40;

const getTickStep = (pxPerYear) => {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const step of steps) {
    if (pxPerYear * step >= 56) return step;
  }
  return 1000;
};

const BuildingLifecycleCard = ({ buildingName, pathways, fixedStartYear, fixedEndYear }) => {
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

    // Count constructions for rebuild labels
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

    return {
      pathwayName: pw.pathway_name,
      intervals,
      events,
      ongoing,
    };
  });

  if (minYear === Infinity) return null;

  // Add padding only when not using fixed scale
  const hasFixedScale = fixedStartYear != null && fixedEndYear != null;
  const yearPadding = hasFixedScale ? 2 : Math.max(Math.ceil((maxYear - minYear) * 0.1), 5);
  const scaleMinYear = minYear - yearPadding;
  const scaleMaxYear = maxYear + yearPadding;
  const yearRange = scaleMaxYear - scaleMinYear;

  // Always reserve ongoing space when using fixed scale for consistent height
  const showOngoing = hasFixedScale ? true : anyOngoing;
  const contentHeight = Math.max(yearRange * PX_PER_YEAR, MIN_HEIGHT);
  const totalHeight = contentHeight + (showOngoing ? ONGOING_HEIGHT : 0);

  // Year to Y position (top = latest, bottom = earliest)
  const yearToY = (year) => {
    return (showOngoing ? ONGOING_HEIGHT : 0) + ((scaleMaxYear - year) / yearRange) * contentHeight;
  };

  const cx = NODE_SIZE / 2;
  const tickStep = getTickStep(PX_PER_YEAR);

  // Generate tick years
  const ticks = [];
  const firstTick = Math.ceil(scaleMinYear / tickStep) * tickStep;
  for (let y = firstTick; y <= scaleMaxYear; y += tickStep) {
    ticks.push(y);
  }

  const colWidth = 130;
  const svgWidth = pathwayData.length * colWidth + AXIS_WIDTH;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #e0e0e0' }}>
        <Title level={5} style={{ margin: 0 }}>
          {buildingName}
        </Title>
        <InfoTooltip tooltipKey="building-lifecycle" />
      </div>

      <svg
        width={svgWidth}
        height={totalHeight + 20}
        style={{ display: 'block' }}
      >
        {/* Year axis on the right */}
        {ticks.map((year) => {
          const y = yearToY(year);
          return (
            <g key={`tick-${year}`}>
              <line
                x1={pathwayData.length * colWidth}
                y1={y}
                x2={pathwayData.length * colWidth + 6}
                y2={y}
                stroke="rgba(100, 116, 139, 0.32)"
                strokeWidth={1}
              />
              <text
                x={pathwayData.length * colWidth + 10}
                y={y + 4}
                fontSize={10}
                fill="#64748B"
              >
                {year}
              </text>
            </g>
          );
        })}

        {/* Pathway columns */}
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
                  <text x={offsetX + 8} y={10} fontSize={10} fill="#94A3B8">
                    ongoing
                  </text>
                </>
              )}

              {/* Lines between consecutive events */}
              {pd.events.map((e, i) => {
                if (i >= pd.events.length - 1) return null;
                const next = pd.events[i + 1];
                const y1 = yearToY(e.year);
                const y2 = yearToY(next.year);
                // Solid when construct→demolish (active period)
                // Dashed when demolish→construct (gap)
                const isDashed = e.type === 'demolish' && next.type === 'construct';
                return (
                  <line
                    key={`line-${colIdx}-${i}`}
                    x1={offsetX}
                    y1={y1}
                    x2={offsetX}
                    y2={y2}
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
                      fontSize={9}
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
                if (!(e.type === 'demolish' && next.type === 'construct')) return null;
                const midY = (yearToY(e.year) + yearToY(next.year)) / 2;
                return (
                  <text
                    key={`gap-${colIdx}-${i}`}
                    x={offsetX + NODE_SIZE / 2 + 6}
                    y={midY + 4}
                    fontSize={9}
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
  );
};

export default BuildingLifecycleCard;
