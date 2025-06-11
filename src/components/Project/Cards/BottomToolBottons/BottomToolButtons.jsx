import { Tooltip } from 'antd';
import {
  DatabaseEditorIcon,
  GraphsIcon,
  InputEditorIcon,
} from '../../../../assets/icons';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import { useHoverGrow } from '../OverviewCard/hooks';

import { animated } from '@react-spring/web';

// TODO: Remove this
const TEMP_DISABLED = ['Database Editor', 'Plots'];

const BottomToolButtons = ({ showTools, onOpenInputEditor }) => {
  const dispatch = useDispatch();

  const items = [
    {
      icon: DatabaseEditorIcon,
      title: 'Database Editor',
      onClick: () => dispatch(push(routes.DATABASE_EDITOR)),
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
      onClick: () => dispatch(push(routes.DASHBOARD)),
      hidden: !showTools,
    },
  ];

  return (
    <div
      id="bottom-buttons"
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
        overlayInnerStyle={{ fontSize: 12 }}
      >
        <_icon className="cea-card-toolbar-icon" />
      </Tooltip>
    );

  return (
    <Tooltip title={title} overlayInnerStyle={{ fontSize: 12 }}>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        <_icon className="cea-card-toolbar-icon" onClick={onClick} />
      </animated.div>
    </Tooltip>
  );
};

export default BottomToolButtons;
