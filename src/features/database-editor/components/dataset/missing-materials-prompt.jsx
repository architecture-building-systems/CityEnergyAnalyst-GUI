import { useState } from 'react';
import { Alert, Button, message } from 'antd';
import { apiClient } from 'lib/api/axios';
import { activeScenarioHeaders } from 'lib/api/scenarioContext';
import useDatabaseEditorStore, {
  MATERIALS_DATA_KEY,
} from 'features/database-editor/stores/databaseEditorStore';
import { withHiddenInDemo } from 'components/HiddenInDemo';

/**
 * Shown in place of the materials table when the scenario has no MATERIALS.csv.
 *
 * Only the CH database ships one, so most scenarios reach this. Rather than the generic
 * "no data available" placeholder, explain where the file comes from and offer the import.
 */
const MissingMaterialsPromptImpl = () => {
  // Refresh in place: a full re-init unmounts the editor and drops the user back at the
  // domain picker instead of leaving them on the materials table they just created.
  const refreshDatabaseData = useDatabaseEditorStore(
    (state) => state.refreshDatabaseData,
  );
  const setSelection = useDatabaseEditorStore((state) => state.setSelection);
  const [busy, setBusy] = useState(false);

  const importSwissMaterials = async () => {
    setBusy(true);
    try {
      await apiClient.post(
        '/inputs/databases/components/materials',
        { source: 'CH' },
        { headers: activeScenarioHeaders() },
      );
      await refreshDatabaseData();
      // Open the table that now exists, so the import ends on the data rather than on
      // whatever the editor happened to be showing.
      const [domain, category, dataset] = MATERIALS_DATA_KEY;
      setSelection({
        domain: domain.toLowerCase(),
        category: category.toLowerCase(),
        dataset,
      });
      message.success('Swiss (CH) materials imported.');
    } catch (error) {
      message.error(
        error?.response?.data?.detail ??
          'Could not import the materials database.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Alert
        type="info"
        showIcon
        message="Materials database not found"
        description={
          <>
            <p style={{ marginTop: 0 }}>
              Editing material layers is a new feature, completed for
              Switzerland (CH) using Swiss material data (KBOB). This
              scenario&rsquo;s database does not include a materials file yet.
            </p>
            <p>
              Importing adds the Swiss material set, with conductivity and
              embodied carbon values. <b>Use at your own risk:</b> the data is
              specific to Switzerland and may not represent materials in your
              region.
            </p>
            <Button
              type="primary"
              loading={busy}
              onClick={importSwissMaterials}
            >
              Import Swiss (CH) materials
            </Button>
          </>
        }
      />
    </div>
  );
};

// Writes are hidden in demo mode, like every other mutating control in this editor.
export const MissingMaterialsPrompt = withHiddenInDemo(
  MissingMaterialsPromptImpl,
);
