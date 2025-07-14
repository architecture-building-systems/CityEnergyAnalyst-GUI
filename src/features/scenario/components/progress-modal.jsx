import { Button, Modal, Result, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

export const CreateScenarioProgressModal = ({
  showModal,
  setShowModal,
  success,
  error,
  fetching,
  onOk,
}) => {
  return (
    <Modal
      centered
      closable={false}
      footer={null}
      open={showModal}
      width="50vw"
    >
      <div>
        <ErrorBoundary>
          {fetching && (
            <Spin
              tip="Creating scenario..."
              indicator={<LoadingOutlined spin />}
              size="large"
            >
              <div style={{ height: 300 }} />
            </Spin>
          )}
          {error && (
            <Result
              status="warning"
              title="Scenario creation failed"
              subTitle={
                error?.detail
                  ? JSON.stringify(error.detail)
                  : 'There was an error while creating the scenario'
              }
              extra={[
                <Button
                  type="primary"
                  key="console"
                  onClick={() => setShowModal(false)}
                >
                  Back
                </Button>,
              ]}
            />
          )}
          {success && (
            <Result
              status="success"
              title="Scenario created successfully!"
              subTitle={
                <>
                  <div>Redirecting to Scenario...</div>
                  <div>Click below if you are not redirected.</div>
                </>
              }
              extra={[
                <Button key="ok" type="primary" onClick={onOk}>
                  Open Scenario
                </Button>,
              ]}
            ></Result>
          )}
        </ErrorBoundary>
      </div>
    </Modal>
  );
};
