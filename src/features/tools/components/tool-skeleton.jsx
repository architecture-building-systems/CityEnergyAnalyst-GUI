import { LoadingOutlined } from '@ant-design/icons';
import { Skeleton, Divider, Spin } from 'antd';

export const ToolSkeleton = ({ loadingText = 'Loading...' }) => {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,

          width: '100%',
          display: 'flex',
          flexDirection: 'column',

          alignItems: 'center',
          justifyContent: 'center',

          gap: 12,

          backdropFilter: 'blur(1px)',
        }}
      >
        <Spin indicator={<LoadingOutlined spin />} size="large" />
        {loadingText}
      </div>
      <Skeleton active />
      <div className="cea-tool-form-buttongroup">
        <Skeleton.Button active />
        <Skeleton.Button active />
        <Skeleton.Button active />
      </div>
      <Divider />
      <Skeleton active />
      <Skeleton active />
      <Skeleton active />
    </div>
  );
};
