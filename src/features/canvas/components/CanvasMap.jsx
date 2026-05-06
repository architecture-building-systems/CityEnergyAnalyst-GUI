import { useEffect, useRef } from 'react';
import { Spin, Tooltip, Dropdown } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import DeckGLMap from 'features/map/components/Map/Map';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import {
  generateConstructionColorMap,
  generateConstructionGfaTotals,
  generateUseTypeColorMap,
  generateUseTypeGfaTotals,
} from 'features/map/utils/constructionColors';
import {
  useScopedCameraOptions,
  useScopedColorMode,
  useScopedExtruded,
  useScopedResetCameraOptions,
  useScopedSetColorMode,
  useScopedSetExtruded,
  useScopedSetMapLabels,
  useScopedSetVisibility,
  useScopedUpdateViewState,
  useScopedViewState,
} from './mapInstance';
import { CameraView, Compass, ExtrudeIcon, LayersIcon } from 'assets/icons';

/**
 * Map card for the Canvas Builder grid.
 *
 * `useInputs({ scenario })` (no project) falls back to the active
 * project's `state.name` — same cache bucket the main viewport uses,
 * so the toolbar's `data?.zone`-gated buttons see the same fetched
 * data. `interactive={false}` gates `DeckGLMap` click handlers so a
 * building click never writes into the singleton input/selection
 * stores; hover tooltips still work.
 *
 * The toolbar is rendered inline (not via `MapControls`) with fully
 * explicit inline styles. Reusing `MapControls` and overriding its
 * CSS classes raced `Toolbar.css`'s 40×40 / 8 px-padded defaults at
 * first paint — icons would land in the NW of the frame until a
 * later layout pass settled. Inline styles on a unique wrapper
 * eliminate the race outright.
 *
 * `showToolbar` (default `true`) hides the inline 4-button toolbar
 * for FeatureCardMaps when `mapsLinked` is on — the overview map
 * tile is the only one that drives the view in that mode.
 */
const CanvasMap = ({
  project,
  scenario,
  showToolbar = true,
  // `false` skips the maplibre child to save a WebGL context per
  // tile (see DeckGLMap). Primary column tiles keep the basemap.
  showBasemap = true,
}) => {
  const resetCameraOptions = useScopedResetCameraOptions();

  const { data, isFetching, isError, refetch } = useInputs(
    scenario ? { scenario } : undefined,
  );
  const { geojsons } = data ?? {};

  useEffect(() => {
    refetch();
    resetCameraOptions();
  }, [project, scenario, refetch, resetCameraOptions]);

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      {isFetching && (
        <div style={overlayStyle}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
            tip={isError ? 'Retrying…' : 'Loading map'}
          >
            <div style={spinFillStyle} />
          </Spin>
        </div>
      )}
      <DeckGLMap
        data={geojsons}
        colors={data?.colors}
        interactive={false}
        showBasemap={showBasemap}
      />
      {showToolbar && geojsons?.zone && (
        <div style={controlsFrameStyle}>
          <InlineLayerToggle scenario={scenario} />
          <InlineExtrudeButton />
          <InlineResetCameraButton />
          <InlineResetCompassButton />
        </div>
      )}
    </div>
  );
};

// ── Inline toolbar buttons ───────────────────────────────────────
// 30×30 inline-styled buttons with no class names or external CSS,
// so first-paint dimensions are pinned and don't race the cascade.

const ICON_BUTTON_SIZE = 30;
const ICON_BUTTON_COUNT = 4;
const ICON_BUTTON_GAP = 2;
const FRAME_PADDING = 3;
const FRAME_BORDER = 1;
const FRAME_WIDTH =
  ICON_BUTTON_SIZE * ICON_BUTTON_COUNT +
  ICON_BUTTON_GAP * (ICON_BUTTON_COUNT - 1) +
  FRAME_PADDING * 2 +
  FRAME_BORDER * 2;
const FRAME_HEIGHT = ICON_BUTTON_SIZE + FRAME_PADDING * 2 + FRAME_BORDER * 2;

const iconButtonStyle = {
  width: ICON_BUTTON_SIZE,
  height: ICON_BUTTON_SIZE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  margin: 0,
  borderRadius: 8,
  fontSize: 18,
  color: '#000',
  cursor: 'pointer',
  flex: '0 0 auto',
  boxSizing: 'border-box',
  userSelect: 'none',
};

const InlineExtrudeButton = () => {
  const extruded = useScopedExtruded();
  const setExtruded = useScopedSetExtruded();
  return (
    <Tooltip title="Toggle 3D" styles={{ body: { fontSize: 12 } }}>
      <div style={iconButtonStyle}>
        <ExtrudeIcon onClick={() => setExtruded(!extruded)} />
      </div>
    </Tooltip>
  );
};

const InlineResetCameraButton = () => {
  const updateViewState = useScopedUpdateViewState();
  const cameraOptions = useScopedCameraOptions();
  const resetCameraOptions = useScopedResetCameraOptions();

  const resetCamera = () => {
    if (cameraOptions) {
      updateViewState({
        pitch: 0,
        zoom: cameraOptions.zoom,
        bearing: cameraOptions.bearing,
        latitude: cameraOptions.center.lat,
        longitude: cameraOptions.center.lng,
      });
    } else {
      updateViewState({ pitch: 0 });
    }
    resetCameraOptions();
  };

  return (
    <Tooltip title="Reset Camera" styles={{ body: { fontSize: 12 } }}>
      <div style={iconButtonStyle}>
        <CameraView onClick={resetCamera} />
      </div>
    </Tooltip>
  );
};

const InlineResetCompassButton = () => {
  const viewState = useScopedViewState();
  const bearings = viewState?.bearing ?? 0;
  const updateViewState = useScopedUpdateViewState();
  return (
    <Tooltip title="Reset Compass" styles={{ body: { fontSize: 12 } }}>
      <div style={iconButtonStyle}>
        <Compass
          style={{ transform: `rotate(${-bearings}deg)` }}
          onClick={() => updateViewState({ bearing: 0 })}
        />
      </div>
    </Tooltip>
  );
};

const InlineLayerToggle = ({ scenario }) => {
  const inputsOpts = scenario ? { scenario } : undefined;
  const { data: inputData } = useInputs(inputsOpts);
  const { geojsons: data } = inputData ?? {};

  const setVisibility = useScopedSetVisibility();
  const setMapLabels = useScopedSetMapLabels();
  const colorMode = useScopedColorMode();
  const setColorMode = useScopedSetColorMode();
  // Construction / use-type colour maps are derived from zone
  // features (cheap, identical across cards) so they stay singleton.
  const setConstructionColorMap = useMapStore(
    (state) => state.setConstructionColorMap,
  );
  const setUseTypeColorMap = useMapStore((state) => state.setUseTypeColorMap);
  const setConstructionGfaTotals = useMapStore(
    (state) => state.setConstructionGfaTotals,
  );
  const setUseTypeGfaTotals = useMapStore((state) => state.setUseTypeGfaTotals);

  // When zone data lands, flip every layer visible. Otherwise the
  // singleton mapStore's visibility map stays empty and deck.gl
  // renders nothing — toolbar would show but map would be blank.
  const visibilityInitDone = useRef(false);
  useEffect(() => {
    if (data?.zone && !visibilityInitDone.current) {
      Object.keys(data).forEach((name) => setVisibility(name, true));
      visibilityInitDone.current = true;
    }
    if (!data?.zone) {
      visibilityInitDone.current = false;
    }
  }, [data, setVisibility]);

  // Build colour maps from zone features and turn on archetype
  // colouring on first load so buildings paint instead of staying grey.
  const colorInitDone = useRef(false);
  useEffect(() => {
    if (data?.zone?.features) {
      setConstructionColorMap(generateConstructionColorMap(data.zone.features));
      setUseTypeColorMap(generateUseTypeColorMap(data.zone.features));
      // Same call site for the GFA aggregates so the legend's
      // right-aligned "<gfa> m² (<pct>%)" column lands together
      // with the colour swatches.
      setConstructionGfaTotals(
        generateConstructionGfaTotals(data.zone.features),
      );
      setUseTypeGfaTotals(generateUseTypeGfaTotals(data.zone.features));
      if (!colorInitDone.current) {
        setColorMode(COLOR_MODES.CONSTRUCTION_STANDARD);
        colorInitDone.current = true;
      }
    } else {
      colorInitDone.current = false;
    }
  }, [
    data?.zone?.features,
    setConstructionColorMap,
    setUseTypeColorMap,
    setConstructionGfaTotals,
    setUseTypeGfaTotals,
    setColorMode,
  ]);

  const isConstructionColor = colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;
  const isUseTypeColor = colorMode === COLOR_MODES.USE_TYPE;

  const items = [];
  if (data?.zone || data?.surroundings || data?.trees || data?.streets) {
    items.push({ type: 'group', label: 'Geometry' });
    if (data?.zone)
      items.push(
        menuItem('zone', 'Zone', (e) =>
          setVisibility('zone', e.target.checked),
        ),
      );
    if (data?.surroundings)
      items.push(
        menuItem('surroundings', 'Surroundings', (e) =>
          setVisibility('surroundings', e.target.checked),
        ),
      );
    if (data?.trees)
      items.push(
        menuItem('trees', 'Trees', (e) =>
          setVisibility('trees', e.target.checked),
        ),
      );
    if (data?.streets)
      items.push(
        menuItem('streets', 'Streets', (e) =>
          setVisibility('streets', e.target.checked),
        ),
      );
  }
  items.push({ type: 'group', label: 'Map Style' });
  items.push(
    menuItem('map_labels', 'Map Labels', (e) => setMapLabels(e.target.checked)),
  );
  if (data?.zone) {
    items.push(
      menuItem('zone_labels', 'Building Names', (e) =>
        setVisibility('zone_labels', e.target.checked),
      ),
    );
    items.push({ type: 'group', label: 'Building Colours' });
    items.push(
      controlledItem(
        'construction_colors',
        'By Construction Archetypes',
        isConstructionColor,
        (on) =>
          setColorMode(
            on ? COLOR_MODES.CONSTRUCTION_STANDARD : COLOR_MODES.DEFAULT,
          ),
      ),
    );
    items.push(
      controlledItem(
        'use_type_colors',
        'By Main Use Types',
        isUseTypeColor,
        (on) => setColorMode(on ? COLOR_MODES.USE_TYPE : COLOR_MODES.DEFAULT),
      ),
    );
  }

  return (
    <Tooltip title="Toggle Layers" styles={{ body: { fontSize: 12 } }}>
      <div style={iconButtonStyle}>
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          popupRender={(menu) => <div style={{ marginBottom: 10 }}>{menu}</div>}
          placement="top"
        >
          <LayersIcon />
        </Dropdown>
      </div>
    </Tooltip>
  );
};

// Layer-toggle menu items reuse the main viewport's `.layer-toggle`
// markup so `Map.css`'s rule strips antd's default dropdown-menu-item
// padding (otherwise it stacks on top of the row's own padding,
// widening the spacing). Wrapping input + text in a `<label>` makes
// clicking the text toggle the checkbox — same as main viewport.
const menuItem = (value, label, onChange) => ({
  key: value,
  label: (
    <div
      className="layer-toggle"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <label className="layer-toggle-label">
        <input
          type="checkbox"
          value={value}
          defaultChecked
          onChange={onChange}
        />
        {label}
      </label>
    </div>
  ),
});

const controlledItem = (key, label, checked, onChange) => ({
  key,
  label: (
    <div
      className="layer-toggle"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <label className="layer-toggle-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    </div>
  ),
});

// ── Styles ───────────────────────────────────────────────────────

const wrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
  borderRadius: 8,
};

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const spinFillStyle = {
  width: 80,
  height: 80,
};

const controlsFrameStyle = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 12,
  border: `${FRAME_BORDER}px solid #dddddd`,
  padding: FRAME_PADDING,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: ICON_BUTTON_GAP,
  fontSize: 12,
  width: FRAME_WIDTH,
  height: FRAME_HEIGHT,
};

export default CanvasMap;
