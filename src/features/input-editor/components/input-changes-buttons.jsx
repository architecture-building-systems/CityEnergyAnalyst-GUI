import { Button, Modal, message } from 'antd';

import { AsyncError } from 'components/AsyncError';
import { useSaveInputs } from 'features/input-editor/hooks/mutations/useSaveInputs';
import { useResyncInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  useChanges,
  useDiscardChanges,
} from 'features/input-editor/stores/inputEditorStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

const ChangesSummary = () => {
  const changes = useChanges();

  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      {Object.keys(changes.delete).length ? (
        <div>
          <b>DELETE:</b>
          {Object.keys(changes.delete).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              <div>
                {changes.delete[table].reduce(
                  (out, building) => `${out}, ${building}`,
                )}
              </div>
              <br />
            </div>
          ))}
        </div>
      ) : null}
      {Object.keys(changes.update).length ? (
        <div>
          <b>UPDATE:</b>
          {Object.keys(changes.update).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              {Object.keys(changes.update[table]).map((building) => (
                <div key={building}>
                  {building}
                  {Object.keys(changes.update[table][building]).map(
                    (property) => (
                      <div key={property}>
                        <i>{property}</i>
                        {` : ${changes.update[table][building][property].oldValue}
                        → 
                        ${changes.update[table][building][property].newValue}`}
                      </div>
                    ),
                  )}
                </div>
              ))}
              <br />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const InputEditorButtons = ({ changes }) => {
  const saveChanges = useSaveInputs();
  const resyncInputs = useResyncInputs();
  const discardChangesFunc = useDiscardChanges();

  const setShowLoginModal = useSetShowLoginModal();

  const discardChanges = async () => {
    // TODO: Throw error
    await resyncInputs();
    discardChangesFunc();
  };

  const noChanges =
    !Object.keys(changes?.update ?? {}).length &&
    !Object.keys(changes?.delete ?? {}).length;

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
          .then(() => {
            message.config({
              top: 120,
            });
            message.success('Changes Saved!');
          })
          .catch((error) => {
            if (error.response.status === 401) setShowLoginModal(true);
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
    <div style={{ display: 'flex', gap: 10 }}>
      <Button
        type="primary"
        disabled={noChanges}
        onClick={_saveChanges}
        size="small"
      >
        Save
      </Button>
      <Button
        type="primary"
        disabled={noChanges}
        onClick={_discardChanges}
        danger
        size="small"
      >
        Discard Changes
      </Button>
    </div>
  );
};
