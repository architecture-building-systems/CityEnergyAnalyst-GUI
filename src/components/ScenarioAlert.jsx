import { Alert } from 'antd';

const ScenarioAlert = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        userSelect: 'none',
      }}
    >
      <Alert
        message="Create / Select / Upload a Scenario to start"
        type="info"
      />
    </div>
  );
};

export default ScenarioAlert;
