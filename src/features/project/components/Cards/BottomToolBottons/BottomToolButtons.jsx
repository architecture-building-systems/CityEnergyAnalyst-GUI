import { Tooltip } from 'antd';
import { DatabaseEditorIcon, ReportsIcon, InputEditorIcon } from 'assets/icons';
import useNavigationStore from 'stores/navigationStore';

import routes from 'constants/routes.json';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { animated } from '@react-spring/web';

// TODO: Remove this
const TEMP_DISABLED = ['reports'];

const BottomToolButtons = ({ showTools, onOpenInputEditor }) => {
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
      id: 'reports',
      icon: ReportsIcon,
      title: 'Reports',
      onClick: () => push(routes?.REPORTS),
      hidden: !showTools,
    },
  ];

  return (
    <div
      className="cea-overlay-card"
      style={{
        display: 'flex',
        gap: 8,
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
        />
      ))}
    </div>
  );
};

const ToolHoverButton = ({ id, title, icon, onClick, hidden }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
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
            <div>[Under development]</div>
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
        <button className="cea-card-toolbar-icon-container" onClick={onClick}>
          <div className="cea-card-toolbar-icon no-hover-color">
            <_icon />
          </div>
        </button>
      </animated.div>
    </Tooltip>
  );
};

export default BottomToolButtons;
