import { useCanvasStore } from '../stores/canvasStore';
import { useProjectStore } from 'features/project/stores/projectStore';

/**
 * Top-of-canvas header for pathway modes — renders the parent
 * scenario name in the same 38 px black-bordered title card the
 * column-0 origin uses in launch / inter-scenario / inter-whatif,
 * with an optional trailing slot for the `<PathwayCompareSelect>`.
 *
 * Sits above the columns row in `pathway-single` and above the row
 * stack in `pathway-multi`. The shared parent scenario only needs
 * to be shown once (every column / row is rooted in it), so the
 * column / row headers below are free to show year labels
 * (`Y_2020`) or pathway names instead of repeating the scenario.
 *
 * Hidden in non-pathway modes — `NavigatorCard` + the column title
 * cards already provide scenario context there.
 */
const CanvasScenarioHeader = ({ trailing = null }) => {
  const view = useCanvasStore((s) => s.view);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  const projectScenario = useProjectStore((s) => s.scenario);

  const isPathwayMode = view === 'pathway-single' || view === 'pathway-multi';
  if (!isPathwayMode) return null;

  const scenarioName = scenarioBasename(parentScenario || projectScenario);
  if (!scenarioName) return null;

  return (
    <div style={rowStyle}>
      <div style={titleCardStyle}>
        <div style={headerStyle} title={scenarioName}>
          {scenarioName}
        </div>
      </div>
      {trailing}
    </div>
  );
};

// Strip path prefix when the scenario field is a full filesystem
// path (`enterPathwaySingle` stores child-state paths there in the
// columns; `parentScenario` is normally just the name).
const scenarioBasename = (raw) => {
  if (!raw) return '';
  const sep = raw.includes('\\') ? '\\' : '/';
  return raw.split(sep).filter(Boolean).pop() ?? raw;
};

// Mirrors `CanvasColumn`'s title card so the scenario reads as a
// peer to the column-header cards below.
const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  paddingBottom: 8,
};

const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '4px 14px',
  boxSizing: 'border-box',
  minWidth: 200,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
};

const headerStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 360,
};

export default CanvasScenarioHeader;
