import { Modal, message } from 'antd';

import { AsyncError } from 'components/AsyncError';
import { SaveDiscardButtons } from 'components/SaveDiscardButtons';
import { useSaveInputs } from 'features/input-editor/hooks/mutations/useSaveInputs';
import { useResyncInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  hasChanges,
  useDiscardChanges,
} from 'features/input-editor/stores/inputEditorStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';
import { ChangesSummary } from 'features/input-editor/components/changes-summary';

export const InputChangesButtons = ({ changes }) => {
  const saveChanges = useSaveInputs();
  const resyncInputs = useResyncInputs();
  const discardChangesFunc = useDiscardChanges();

  const setShowLoginModal = useSetShowLoginModal();

  const discardChanges = async () => {
    // TODO: Throw error
    await resyncInputs();
    discardChangesFunc();
  };

  // Shared with the card that renders these buttons, so the two can never disagree about
  // whether there is anything to save.
  const noChanges = !hasChanges(changes);

  const _saveChanges = () => {
    Modal.confirm({
      title: 'Save these changes?',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'SAVE',
      okType: 'primary',
      cancelText: 'Cancel',
      async onOk() {
        await saveChanges
          .mutateAsync()
          .then(({ data }) => {
            message.config({
              top: 120,
            });
            // `remapped_buildings` is only present when an archetype-key edit (or a new
            // building) made the server re-derive envelope/HVAC/comfort/loads/supply/schedules
            // for those buildings automatically -- worth calling out since it is not something
            // this save directly asked for. `skipped_tables` is not: while locked, every save
            // skips the same derived tables every time, and the editor already shows them as
            // read-only, so repeating that on each save would just be noise.
            const remapped = data?.remapped_buildings ?? [];
            message.success(
              remapped.length
                ? `Changes saved. Re-derived ${remapped.length} building${remapped.length === 1 ? '' : 's'} from their archetype.`
                : 'Changes Saved!',
            );
          })
          .catch((error) => {
            // Optional: a network failure has no `response`, and reading `.status` off it
            // would throw inside the catch, replacing the error modal with a blank screen.
            if (error?.response?.status === 401) setShowLoginModal(true);
            else {
              Modal.error({
                title: 'Could not save changes',
                content: <AsyncError error={error} />,
                width: '80vw',
              });
            }
          });
      },
    });
  };

  const _discardChanges = () => {
    Modal.confirm({
      title: 'This will discard all unsaved changes.',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'DISCARD',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        await discardChanges()
          .then(() => {
            message.config({
              top: 120,
            });
            message.info('Unsaved changes have been discarded.');
          })
          .catch((error) => {
            console.error(error);
            message.error('Something went wrong.', 0);
          });
      },
    });
  };

  if (noChanges) return <div></div>;

  return (
    <SaveDiscardButtons onSave={_saveChanges} onDiscard={_discardChanges} />
  );
};
