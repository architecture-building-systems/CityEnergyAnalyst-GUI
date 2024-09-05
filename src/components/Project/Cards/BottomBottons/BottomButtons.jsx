import { Tooltip } from 'antd';
import {
  DatabaseEditorIcon,
  GraphsIcon,
  InputEditorIcon,
} from '../../../../assets/icons';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';

const BottomButtons = ({ onOpenInputEditor }) => {
  const dispatch = useDispatch();

  return (
    <div style={{ display: 'flex', gap: 2, color: '#fff' }}>
      <Tooltip title="Database Editor" overlayInnerStyle={{ fontSize: 12 }}>
        <DatabaseEditorIcon
          className="cea-card-toolbar-icon"
          onClick={() => dispatch(push(routes.DATABASE_EDITOR))}
        />
      </Tooltip>
      <Tooltip title="Input Editor" overlayInnerStyle={{ fontSize: 12 }}>
        <InputEditorIcon
          className="cea-card-toolbar-icon"
          onClick={() => onOpenInputEditor?.()}
        />
      </Tooltip>
      <Tooltip title="Plots" overlayInnerStyle={{ fontSize: 12 }}>
        <GraphsIcon
          className="cea-card-toolbar-icon"
          onClick={() => dispatch(push(routes.DASHBOARD))}
        />
      </Tooltip>
    </div>
  );
};

export default BottomButtons;
