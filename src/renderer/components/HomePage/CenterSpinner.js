import { Spin } from 'antd';

const CenterSpinner = ({ style = {}, ...props }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        ...style,
      }}
    >
      <Spin {...props} />
    </div>
  );
};

export default CenterSpinner;
