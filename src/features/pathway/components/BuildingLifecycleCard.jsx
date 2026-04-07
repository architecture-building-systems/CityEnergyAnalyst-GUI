import { Typography } from 'antd';
import InfoTooltip from 'components/InfoTooltip';

const { Text, Title } = Typography;

const NODE_SIZE = 12;
const LINE_HEIGHT = 48;

const LifecycleTimeline = ({ pathwayName, intervals }) => {
  if (!intervals?.length) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          {pathwayName}
        </Text>
        <Text style={{ fontSize: 11, color: '#94A3B8' }}>No events</Text>
      </div>
    );
  }

  const events = [];
  for (const [start, end] of intervals) {
    events.push({ year: start, type: 'construct' });
    if (end != null) {
      events.push({ year: end, type: 'demolish' });
    }
  }
  events.sort((a, b) => a.year - b.year);

  const segments = [];
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const next = events[i + 1];
    segments.push({
      event: current,
      gapAfter: current.type === 'demolish' && next?.type === 'construct',
      isLast: i === events.length - 1,
    });
  }

  const reversed = [...segments].reverse();

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        {pathwayName}
      </Text>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {segments.length > 0 &&
          segments[segments.length - 1].event.type === 'construct' &&
          segments[segments.length - 1].isLast && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
                marginLeft: (NODE_SIZE - 2) / 2,
              }}
            >
              <div style={{ width: 2, height: 16, background: '#1470AF' }} />
              <Text style={{ fontSize: 10, color: '#94A3B8' }}>ongoing</Text>
            </div>
          )}

        {reversed.map((seg, i) => {
          const isConstruct = seg.event.type === 'construct';
          const nodeColor = isConstruct ? '#1470AF' : '#f04d5b';
          const label = isConstruct ? 'Constructed' : 'Demolished';

          return (
            <div key={`${seg.event.year}-${seg.event.type}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderRadius: '50%',
                    background: nodeColor,
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <Text strong style={{ fontSize: 12 }}>
                    Y_{seg.event.year}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: isConstruct ? '#1470AF' : '#f04d5b',
                    }}
                  >
                    {label}
                  </Text>
                </div>
              </div>

              {i < reversed.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: LINE_HEIGHT,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: '100%',
                      marginLeft: (NODE_SIZE - 2) / 2,
                      background: seg.gapAfter ? 'transparent' : '#8eb6dc',
                      borderLeft: seg.gapAfter ? '2px dashed #CBD5E1' : 'none',
                    }}
                  />
                  {seg.gapAfter && (
                    <Text style={{ fontSize: 10, color: '#CBD5E1' }}>gap</Text>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BuildingLifecycleCard = ({ buildingName, pathways }) => {
  if (!buildingName || !pathways?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Title level={5} style={{ margin: 0 }}>
          {buildingName}
        </Title>
        <InfoTooltip tooltipKey="building-lifecycle" />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
        }}
      >
        {pathways.map((pw) => (
          <LifecycleTimeline
            key={pw.pathway_name}
            pathwayName={pw.pathway_name}
            intervals={(pw.intervals ?? []).map((i) => [i.start, i.end])}
          />
        ))}
      </div>
    </div>
  );
};

export default BuildingLifecycleCard;
