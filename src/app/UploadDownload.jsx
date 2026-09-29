import { Col, Row } from 'antd';
import ErrorBoundary from 'utils/ReportingErrorBoundary';
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default UploadDownload;
