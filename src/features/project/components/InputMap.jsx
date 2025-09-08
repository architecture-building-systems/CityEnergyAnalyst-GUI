import { useEffect } from 'react';
import { message, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import DeckGLMap from 'features/map/components/Map/Map';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { useMapStore } from 'features/map/stores/mapStore';

const InputMap = ({ project, scenario }) => {
  const { data, refetch, isFetching, isError, error } = useInputs();
  const { geojsons, colors } = data ?? {};

  const [messageApi, contextHolder] = message.useMessage();
  const onError = (error) => {
    messageApi.open({
      type: 'error',
      key: 'input-map-error',
      content: `Error reading inputs for "${scenario}". (${error.message ?? 'Unknown error: Unable to fetch inputs.'})`,
      style: {
        marginTop: 120,
      },
      duration: 5,
    });
  };

  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  useEffect(() => {
    refetch();
    resetCameraOptions();
  }, [project, scenario]);

  useEffect(() => {
    // Only show error after retries
    if (isError && !isFetching) {
      onError(error);
    }
  }, [isError, isFetching]);

  return (
    <>
      {contextHolder}
      <div
        style={{
          height: '100%',
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.05)',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {isFetching && (
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 50 }} spin />}
            tip={
              isError ? 'Error reading inputs. Retrying...' : 'Loading Inputs'
            }
            size="large"
            percent="auto"
            fullscreen
          />
        )}
        <DeckGLMap data={geojsons} colors={colors} />
      </div>
    </>
  );
};

export default InputMap;
