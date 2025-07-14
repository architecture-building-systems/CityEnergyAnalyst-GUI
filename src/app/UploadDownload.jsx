import { Alert, Col, Row } from 'antd';
import UploadForm from 'features/upload-download/components/UploadForm';
import DownloadForm from 'features/upload-download/components/DownloadForm';

const style = {
  height: '100%',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 8,
  border: '1px solid #eee',
};

const UploadDownload = () => {
  return (
    <Alert.ErrorBoundary>
      <Row style={{ height: '100%' }} gutter={24}>
        <Col span={12}>
          <div style={style}>
            <DownloadForm />
          </div>
        </Col>
        <Col span={12}>
          <div style={style}>
            <UploadForm />
          </div>
        </Col>
      </Row>
    </Alert.ErrorBoundary>
  );
};

export default UploadDownload;
