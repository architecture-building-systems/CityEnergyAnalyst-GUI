import { Button, ConfigProvider, Select, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useProjectStore } from 'features/project/stores/projectStore';
import {
  fetchPathwayOverview,
  switchToChildScenario,
  switchToParentScenario,
} from '../api';

const { Text } = Typography;

const LANE_PADDING = 40;
const LABEL_WIDTH = 140;
const BAR_HEIGHT = 55;

const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#CBD5E1',
  baked: '#1470AF',
  simulated: '#000000',
};

const getTickStep = (pxPerYear) => {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const step of steps) {
    if (pxPerYear * step >= 56) {
      return step;
    }
  }
  return 1000;
};

const PathwayViewer = ({ hidden }) => {
  const queryClient = useQueryClient();
  const childScenario = useProjectStore((s) => s.childScenario);
  const setChildScenario = useProjectStore((s) => s.setChildScenario);
  const clearChildScenario = useProjectStore((s) => s.clearChildScenario);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState(null);
  const viewportMeasureRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

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
  }, [hidden]);

  const bakedPathways = useMemo(() => {
    if (!overview?.pathways) return [];
    return overview.pathways.filter((p) => p.all_baked);
  }, [overview]);

  useEffect(() => {
    if (
      bakedPathways.length > 0 &&
      !bakedPathways.find((p) => p.pathway_name === selectedPathway)
    ) {
      setSelectedPathway(bakedPathways[0].pathway_name);
    }
  }, [bakedPathways, selectedPathway]);

  const currentPathway = useMemo(
    () => bakedPathways.find((p) => p.pathway_name === selectedPathway),
    [bakedPathways, selectedPathway],
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

  const tickYears = useMemo(() => {
    if (startYear == null || endYear == null) return [];
    const step = getTickStep(pxPerYear);
    const ticks = new Set([startYear, endYear]);
    const firstTick = Math.ceil(startYear / step) * step;
    for (let year = firstTick; year <= endYear; year += step) {
      ticks.add(year);
    }
    return [...ticks].sort((left, right) => left - right);
  }, [endYear, pxPerYear, startYear]);

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

  const handleBack = async () => {
    setSwitching(true);
    try {
      await switchToParentScenario();
      clearChildScenario();
      queryClient.invalidateQueries();
    } catch {
      // silently fail
    } finally {
      setSwitching(false);
    }
  };

  if (hidden || (!loading && bakedPathways.length === 0)) return null;

  const pathwayOptions = bakedPathways.map((p) => ({
    label: p.pathway_name,
    value: p.pathway_name,
  }));

  return (
    <div
      className="cea-overlay-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: BAR_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        gap: 0,
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
        <>
          {/* Dropdown */}
          <div
            style={{
              width: LABEL_WIDTH,
              flexShrink: 0,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ConfigProvider
              theme={{
                components: {
                  Select: {
                    selectorBg: '#1470AF',
                    colorText: '#fff',
                    colorTextPlaceholder: 'rgba(255,255,255,0.65)',
                    colorIcon: '#fff',
                    colorIconHover: '#fff',
                    optionActiveBg: 'rgba(20,112,175,0.12)',
                    optionSelectedBg: 'rgba(20,112,175,0.18)',
                  },
                },
              }}
            >
              <Select
                style={{ width: '100%' }}
                styles={{ popup: { root: { width: 200 } } }}
                size="small"
                value={selectedPathway}
                onChange={setSelectedPathway}
                options={pathwayOptions}
                placeholder="Pathway"
              />
            </ConfigProvider>
          </div>

          {/* Timeline */}
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
              {/* Tick labels at top */}
              {tickYears.map((year) => (
                <Text
                  key={`tick-${year}`}
                  style={{
                    position: 'absolute',
                    left: getYearOffset(year),
                    top: 4,
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {year}
                </Text>
              ))}

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

              {/* Nodes */}
              {years.map((year) => {
                const phase = yearPhases[String(year)] ?? 'none';
                const nodeFill = STATUS_FILL[phase] ?? STATUS_FILL.none;
                const isActive =
                  childScenario?.pathway_name === selectedPathway &&
                  childScenario?.year === year;

                return (
                  <button
                    key={`${selectedPathway}-${year}`}
                    type="button"
                    onClick={() => handleNodeClick(selectedPathway, year)}
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
                );
              })}
            </div>
          </div>

          {/* Back button */}
          {childScenario ? (
            <div
              style={{
                flexShrink: 0,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Button size="small" loading={switching} onClick={handleBack}>
                Back
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default PathwayViewer;
