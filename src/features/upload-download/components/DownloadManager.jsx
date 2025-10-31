import { useEffect, useState } from 'react';
import { Badge, Button, Empty, Popover, Progress, Space, message } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import useDownloadStore from '../stores/downloadStore';

const DownloadManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const downloadsMap = useDownloadStore((state) => state.downloads);
  const fetchDownloads = useDownloadStore((state) => state.fetchDownloads);
  const downloadFile = useDownloadStore((state) => state.downloadFile);
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const initializeSocketListeners = useDownloadStore(
    (state) => state.initializeSocketListeners,
  );
  const cleanupSocketListeners = useDownloadStore(
    (state) => state.cleanupSocketListeners,
  );

  // Convert downloads map to array, sorted by creation date
  const downloads = Object.values(downloadsMap).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  // Initialize socket listeners and fetch downloads on mount
  useEffect(() => {
    initializeSocketListeners();
    fetchDownloads().catch((error) => {
      console.error('Failed to fetch downloads:', error);
    });

    return () => {
      cleanupSocketListeners();
    };
  }, [initializeSocketListeners, cleanupSocketListeners, fetchDownloads]);

  // Count active downloads (not downloaded)
  const activeDownloads = downloads.filter((d) => d.state !== 'DOWNLOADED');

  const handleDownload = async (downloadId) => {
    try {
      await downloadFile(downloadId);
      message.success('Download started');
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || 'Failed to download file';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (downloadId) => {
    try {
      await deleteDownload(downloadId);
      message.success('Download deleted');
    } catch (error) {
      message.error('Failed to delete download');
    }
  };

  const content = (
    <div
      style={{
        width: 400,
        maxHeight: 500,
        overflowY: 'auto',
      }}
    >
      {downloads.length === 0 ? (
        <Empty
          description="No downloads yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {downloads.map((download) => (
            <DownloadItem
              key={download.id}
              download={download}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </Space>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Downloads"
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="topRight"
    >
      <div className="cea-status-bar-button" style={{ cursor: 'pointer' }}>
        <Badge count={activeDownloads.length} showZero={false} size="small">
          <span>
            <DownloadOutlined style={{ fontSize: 16, color: 'white' }} />
          </span>
        </Badge>
      </div>
    </Popover>
  );
};

const DownloadItem = ({ download, onDownload, onDelete }) => {
  const {
    id,
    state,
    scenarios = [],
    file_size_mb,
    progress_message,
    error_message,
  } = download;

  const scenarioLabel =
    scenarios.length === 1 ? scenarios[0] : `${scenarios.length} scenarios`;

  const getStateIcon = () => {
    switch (state) {
      case 'PENDING':
      case 'PREPARING':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'READY':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'DOWNLOADING':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'DOWNLOADED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'ERROR':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'ERROR':
        return '#fff1f0';
      case 'READY':
        return '#f6ffed';
      case 'DOWNLOADED':
        return '#e6f7ff';
      default:
        return '#ffffff';
    }
  };

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        backgroundColor: getStateColor(),
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            {getStateIcon()}
            <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
              {scenarioLabel}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {progress_message || 'Waiting...'}
          </div>
          {file_size_mb && (
            <div style={{ fontSize: 12, color: '#666' }}>
              Size: {file_size_mb.toFixed(2)} MB
            </div>
          )}
          {error_message && (
            <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
              Error: {error_message}
            </div>
          )}
        </div>
        <Space size="small">
          {state === 'READY' && (
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(id)}
            >
              Download
            </Button>
          )}
          {state !== 'DOWNLOADING' && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(id)}
            />
          )}
        </Space>
      </div>

      {state === 'PREPARING' && (
        <Progress percent={100} status="active" showInfo={false} />
      )}
      {state === 'DOWNLOADING' && (
        <Progress percent={100} status="active" showInfo={false} />
      )}
    </div>
  );
};

export default DownloadManager;
