import { Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useProjectStore } from 'features/project/stores/projectStore';
import { fetchPathwayOverview, switchToChildScenario } from '../api';

const { Text } = Typography;

const LANE_PADDING = 40;
const BAR_HEIGHT = 55;

const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#CBD5E1',
  baked: '#1470AF',
  simulated: '#000000',
};

const PathwayViewer = ({ hidden }) => {
  const queryClient = useQueryClient();
  const childScenario = useProjectStore((s) => s.childScenario);
  const setChildScenario = useProjectStore((s) => s.setChildScenario);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [hoveredYear, setHoveredYear] = useState(null);
  const viewportMeasureRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Selected pathway comes from the OverviewCard dropdown via the store
  const selectedPathway = childScenario?.pathway_name ?? null;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPathwayOverview();
      setOverview(data);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hidden) {
      loadOverview();
    }
  }, [hidden, loadOverview]);

  useEffect(() => {
    const el = viewportMeasureRef.current;
    if (!el) return undefined;
    const update = () => setViewportWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hidden, selectedPathway]);

  const currentPathway = useMemo(
    () => overview?.pathways?.find((p) => p.pathway_name === selectedPathway),
    [overview, selectedPathway],
  );

  const years = currentPathway?.years ?? [];
  const yearPhases = currentPathway?.year_phases ?? {};
  const span = overview?.span ?? {};
  const startYear = span.start_year;
  const endYear = span.end_year;
  const yearRange = useMemo(() => {
    if (startYear == null || endYear == null) return 1;
    return Math.max(endYear - startYear, 1);
  }, [startYear, endYear]);

  const fitWidth = Math.max((viewportWidth || 300) - LANE_PADDING * 2, 80);
  const pxPerYear = fitWidth / yearRange;
  const contentWidth = LANE_PADDING * 2 + yearRange * pxPerYear;

  const getYearOffset = useCallback(
    (year) => {
      if (startYear == null) return LANE_PADDING;
      return LANE_PADDING + (year - startYear) * pxPerYear;
    },
    [pxPerYear, startYear],
  );

  const handleNodeClick = async (pathwayName, year) => {
    const phase = yearPhases[String(year)] ?? 'none';
    if (phase !== 'baked' && phase !== 'simulated') return;

    setSwitching(true);
    try {
      const result = await switchToChildScenario(pathwayName, year);
      setChildScenario({
        pathway_name: pathwayName,
        year,
        parent_scenario: result.parent_scenario,
      });
      queryClient.invalidateQueries();
    } catch {
      // silently fail
    } finally {
      setSwitching(false);
    }
  };

  // Hide if no pathway selected from OverviewCard, or hidden prop
  if (hidden || !selectedPathway || (!loading && !currentPathway)) return null;

  return (
    <div
      className="cea-overlay-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: BAR_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: '100%',
          }}
        >
          <Spin size="small" />
        </div>
      ) : (
        <div
          ref={viewportMeasureRef}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: contentWidth,
              minWidth: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Lane line */}
            <div
              style={{
                position: 'absolute',
                left: LANE_PADDING,
                right: LANE_PADDING,
                top: '58%',
                height: 1,
                background: '#8eb6dc',
                borderRadius: 999,
              }}
            />

            {/* Nodes with labels */}
            {years.map((year) => {
              const phase = yearPhases[String(year)] ?? 'none';
              const nodeFill = STATUS_FILL[phase] ?? STATUS_FILL.none;
              const isActive =
                childScenario?.year === year &&
                childScenario?.pathway_name === selectedPathway;
              const showLabel = isActive || hoveredYear === year;

              return (
                <div key={`${selectedPathway}-${year}`}>
                  {showLabel && (
                    <Text
                      style={{
                        position: 'absolute',
                        left: getYearOffset(year),
                        top: 6,
                        transform: 'translateX(-50%)',
                        fontSize: 10,
                        color: '#94A3B8',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {year}
                    </Text>
                  )}
                  <button
                    type="button"
                    onClick={() => handleNodeClick(selectedPathway, year)}
                    onMouseEnter={() => setHoveredYear(year)}
                    onMouseLeave={() => setHoveredYear(null)}
                    disabled={switching}
                    style={{
                      position: 'absolute',
                      left: getYearOffset(year),
                      top: '58%',
                      transform: 'translate(-50%, -50%)',
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      border: '2px solid #FFFFFF',
                      background: nodeFill,
                      cursor:
                        phase === 'baked' || phase === 'simulated'
                          ? 'pointer'
                          : 'default',
                      padding: 0,
                      boxShadow: isActive
                        ? '0 0 0 6px rgba(20, 112, 175, 0.14), 0 2px 6px rgba(15, 23, 42, 0.12)'
                        : '0 2px 6px rgba(15, 23, 42, 0.12)',
                    }}
                    aria-label={`${selectedPathway} ${year}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PathwayViewer;
