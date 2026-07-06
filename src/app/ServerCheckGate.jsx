import { Button } from 'antd';

import Loading from 'components/Loading';
import { useWaitForServer } from 'stores/useServerVersionQuery';

const ServerCheckGate = ({ children }) => {
  const serverStatus = useWaitForServer();

  if (serverStatus.isUnreachable) {
    return (
      <Loading animate={false}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>Unable to connect to the CEA server.</span>
          <Button onClick={() => serverStatus.refetch()}>Retry</Button>
        </div>
      </Loading>
    );
  }

  if (!serverStatus.isSuccess) return <Loading />;

  return children;
};

export default ServerCheckGate;
