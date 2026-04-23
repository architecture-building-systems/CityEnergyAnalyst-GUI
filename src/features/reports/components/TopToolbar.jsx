import { Button, Space, Modal } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { RefreshIcon } from 'assets/icons';

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
        <Button icon={<RefreshIcon />} onClick={handleStartOver}>
          Start Over
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

export default TopToolbar;
