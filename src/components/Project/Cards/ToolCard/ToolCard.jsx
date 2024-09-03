import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from '../../../Tools/Tool';
import { Button } from 'antd';

const ToolCard = ({ selectedTool, onClose }) => {
  return (
    <div
      style={{
        background: '#fff',

        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        display: 'flex',
        flexDirection: 'column',

        height: '100%',
        boxSizing: 'border-box',
        padding: 24,

        overflow: 'auto',

        width: '33vw',
        minWidth: 450,
      }}
    >
      <Button onClick={() => onClose?.(true)} style={{ marginRight: 'auto' }}>
        <VerticalLeftOutlined />
      </Button>
      <Tool script={selectedTool} />
    </div>
  );
};

export default ToolCard;
