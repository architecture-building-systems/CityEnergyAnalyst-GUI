import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

const CenterSpinner = ({
  tip = '',
  indicator = null,
  style = {},
  size = 'default',
  content = null,
}) => {
  const _indicator = indicator ? (
    indicator
  ) : (
    <LoadingOutlined style={{ fontSize: 24 }} spin />
  );

  const _content = content ? (
    content
  ) : (
    <div style={{ minHeight: 400, ...style }} />
  );

  return (
    <Spin
      size={size}
      tip={tip}
      indicator={_indicator}
      wrapperClassName="centerSpinner"
    >
      {_content}
    </Spin>
  );
};

export default CenterSpinner;
