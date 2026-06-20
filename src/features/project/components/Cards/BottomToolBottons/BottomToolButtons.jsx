import { Tooltip } from 'antd';
import {
  DatabaseEditorIcon,
  InsightIcon,
  ReportsIcon,
  InputEditorIcon,
  TimelineIcon,
} from 'assets/icons';
import useNavigationStore from 'stores/navigationStore';

import routes from 'constants/routes.json';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { animated } from '@react-spring/web';

// Mark the entry as not yet wired; renders the button with a
// "[Coming soon]" tooltip and no click handler.
const TEMP_DISABLED = ['reports'];

const BottomToolButtons = ({
  showTools,
  onOpenInputEditor,
  onTogglePathwayPanel,
  pathwayPanelOpen,
  hidePathwayBuilder,
}) => {
  const { push } = useNavigationStore();

  const items = [
    {
      id: 'database-editor',
      icon: DatabaseEditorIcon,
      title: 'Database Editor',
      onClick: () => push(routes.DATABASE_EDITOR),
      hidden: !showTools,
    },
    {
      id: 'input-editor',
      icon: InputEditorIcon,
      title: 'Input Editor',
      onClick: () => onOpenInputEditor?.(),
      hidden: !showTools,
    },
    {
      id: 'pathway',
      icon: TimelineIcon,
      title: 'Pathway Builder [BETA]',
      onClick: () => onTogglePathwayPanel?.(),
      hidden: !showTools || hidePathwayBuilder,
      active: pathwayPanelOpen,
    },
    {
      id: 'canvas',
      icon: InsightIcon,
      title: 'Canvas Builder [BETA]',
      onClick: () => push(routes?.CANVAS),
      hidden: !showTools,
    },
    {
      id: 'reports',
      icon: ReportsIcon,
      title: 'Report Builder',
      hidden: !showTools,
    },
  ];

  return (
    <div
      className="cea-overlay-card"
      style={{
        display: 'flex',
        gap: 5,
      }}
    >
      {items.map((item) => (
        <ToolHoverButton
          key={item.title}
          id={item.id}
          icon={item.icon}
          title={item.title}
          onClick={item.onClick}
          hidden={item.hidden}
          active={item.active}
        />
      ))}
    </div>
  );
};

const ToolHoverButton = ({ id, title, icon, onClick, hidden, active }) => {
  // Half the default hover-enlarge (1.2 → 1.1) so the five bottom-
  // left buttons read as a tighter row — the default 20 % grow felt
  // too prominent at this scale. Other call sites of `useHoverGrow`
  // (ToolFormButtons, ShowHideCardsButton) keep the default.
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow(1, 1.1);
  const _icon = icon;

  if (hidden) return null;

  if (TEMP_DISABLED.includes(id))
    return (
      <Tooltip
        title={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div>{`${title}`}</div>
            <div>[Coming soon]</div>
          </div>
        }
        styles={{ body: { fontSize: 12 } }}
      >
        <button className="cea-card-toolbar-icon-container">
          <div className="cea-card-toolbar-icon no-hover-color">
            <_icon />
          </div>
        </button>
      </Tooltip>
    );

  return (
    <Tooltip title={title} styles={{ body: { fontSize: 12 } }}>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        <button
          className="cea-card-toolbar-icon-container"
          onClick={onClick}
          style={{
            background: active ? 'rgba(38, 89, 160, 0.12)' : undefined,
          }}
        >
          <div className="cea-card-toolbar-icon no-hover-color">
            <_icon />
          </div>
        </button>
      </animated.div>
    </Tooltip>
  );
};

export default BottomToolButtons;
