import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from '../../../Tools/Tool';
import { Button } from 'antd';

const ToolCard = ({ selectedTool, onClose, onToolSelected }) => {
  return (
    <div
      style={{
        background: '#fff',

        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        display: 'flex',
        flexDirection: 'column',
        gap: 12,

        height: '100%',
        boxSizing: 'border-box',
        padding: 24,

        width: '33vw',
        minWidth: 450,
      }}
    >
      <Button
        icon={<VerticalLeftOutlined />}
        onClick={() => onClose?.(true)}
        style={{ marginRight: 'auto', padding: 12 }}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <Tool script={selectedTool} onToolSelected={onToolSelected} />
      </div>
    </div>
  );
};

export default ToolCard;
