import { Tooltip } from 'antd';
import { DatabaseEditorIcon, GraphsIcon, InputEditorIcon } from 'assets/icons';
import useNavigationStore from 'stores/navigationStore';

import routes from 'constants/routes.json';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { animated } from '@react-spring/web';

// TODO: Remove this
const TEMP_DISABLED = ['Database Editor', 'Plots'];

const BottomToolButtons = ({ showTools, onOpenInputEditor }) => {
  const { push } = useNavigationStore();

  const items = [
    {
      icon: DatabaseEditorIcon,
      title: 'Database Editor',
      onClick: () => push(routes.DATABASE_EDITOR),
      hidden: !showTools,
    },
    {
      icon: InputEditorIcon,
      title: 'Input Editor',
      onClick: () => onOpenInputEditor?.(),
      hidden: !showTools,
    },
    {
      icon: GraphsIcon,
      title: 'Plots',
      onClick: () => push(routes.DASHBOARD),
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
          icon={item.icon}
          title={item.title}
          onClick={item.onClick}
          hidden={item.hidden}
        />
      ))}
    </div>
  );
};

const ToolHoverButton = ({ title, icon, onClick, hidden }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  const _icon = icon;

  if (hidden) return null;

  if (TEMP_DISABLED.includes(title))
    return (
      <Tooltip
        title={`${title} [Under development]`}
        styles={{ body: { fontSize: 12 } }}
      >
        <div className="cea-card-toolbar-icon-container">
          <div className="cea-card-toolbar-icon no-hover-color">
            <_icon />
          </div>
        </div>
      </Tooltip>
    );

  return (
    <Tooltip title={title} styles={{ body: { fontSize: 12 } }}>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        <div className="cea-card-toolbar-icon-container">
          <button
            className="cea-card-toolbar-icon no-hover-color"
            onClick={onClick}
            type="button"
          >
            <_icon />
          </button>
        </div>
      </animated.div>
    </Tooltip>
  );
};

export default BottomToolButtons;
