import { Button, Space, Modal } from 'antd';
import {
  LeftOutlined,
  ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';

import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useReportsStore } from '../stores/reportsStore';

const TopToolbar = () => {
  const { push } = useNavigationStore();
  const view = useReportsStore((s) => s.view);
  const columns = useReportsStore((s) => s.columns);
  const startOver = useReportsStore((s) => s.startOver);

  const handleReturn = () => {
    push(routes.PROJECT);
  };

  const handleStartOver = () => {
    // If user has columns, confirm before clearing
    if (view !== 'launch' && columns.length > 0) {
      Modal.confirm({
        title: 'Start over?',
        content:
          'This will clear all comparison columns and return to the launch view.',
        okText: 'Start over',
        cancelText: 'Cancel',
        onOk: startOver,
      });
    } else {
      startOver();
    }
  };

  return (
    <div style={toolbarStyle}>
      <Space size="small">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleStartOver}>
          Start Over
        </Button>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          style={exportButtonStyle}
          disabled
        >
          Export
        </Button>
      </Space>
    </div>
  );
};

const toolbarStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  padding: '8px 0',
};

const exportButtonStyle = {
  background: '#333',
  borderColor: '#333',
};

export default TopToolbar;
