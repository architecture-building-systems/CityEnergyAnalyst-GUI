import { ProductOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export const LoadExampleButton = ({ onClick }) => {
  return (
    <>
      <Button
        icon={<ProductOutlined />}
        className="open-new-project-btn"
        onClick={onClick}
        style={{ flex: 1 }}
      >
        Load Example Project
      </Button>
    </>
  );
};
