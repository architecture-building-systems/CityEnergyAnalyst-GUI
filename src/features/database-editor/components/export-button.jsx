import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Button, message, Modal } from 'antd';
import { useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { apiClient } from 'lib/api/axios';
import { useProjectStore } from 'features/project/stores/projectStore';

export const ExportDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const databaseValidation = useDatabaseEditorStore(
    (state) => state.validation,
  );
  const databaseChanges = useDatabaseEditorStore((state) => state.changes);
  const [loading, setLoading] = useState(false);
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  if (status !== 'success') return null;

  const hasValidationErrors = !!Object.keys(databaseValidation).length;
  const hasUnsavedChanges = !!databaseChanges.length;

  const handleDownload = () => {
    Modal.confirm({
      title: 'Confirm Download',
      content: 'Are you sure you want to download the database?',
      okText: 'Download',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        const scenarioParams =
          project && scenario ? { project, scenario_name: scenario } : {};
        try {
          const response = await apiClient.get(
            '/api/inputs/databases/download',
            {
              responseType: 'blob',
              params: scenarioParams,
            },
          );

          // Create download link
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          // Generate filename with current date
          const date = new Date().toISOString().split('T')[0];
          link.download = `database-export-${date}.zip`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          message.config({ top: 120 });
          message.success('Database successfully downloaded');
        } catch (err) {
          console.error(err);
          message.config({ top: 120 });
          message.error('Failed to download database');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Button
      icon={<DownloadOutlined />}
      disabled={hasValidationErrors || hasUnsavedChanges}
      loading={loading}
      onClick={handleDownload}
      title={
        hasUnsavedChanges
          ? 'Please save changes before downloading'
          : hasValidationErrors
            ? 'Please fix validation errors before downloading'
            : 'Download database'
      }
    >
      Download
    </Button>
  );
};
