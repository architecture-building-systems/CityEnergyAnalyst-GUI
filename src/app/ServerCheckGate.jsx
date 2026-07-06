import { useEffect } from 'react';
import { Button } from 'antd';

import Loading from 'components/Loading';
import { useWaitForServer } from 'stores/useServerVersionQuery';
import { getSocket } from 'lib/socket';

const ServerCheckGate = ({ children }) => {
  const serverStatus = useWaitForServer();

  useEffect(() => {
    if (serverStatus.isSuccess) getSocket();
  }, [serverStatus.isSuccess]);

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
