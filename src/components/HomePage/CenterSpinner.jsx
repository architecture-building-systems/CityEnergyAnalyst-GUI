import { Spin } from 'antd';

const CenterSpinner = ({ tip = '', indicator = <></> }) => {
  return (
    <Spin tip={tip} indicator={indicator} wrapperClassName="centerSpinner">
      <div style={{ minHeight: 400 }} />
    </Spin>
  );
};

export default CenterSpinner;
