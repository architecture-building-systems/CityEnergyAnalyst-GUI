import React from 'react';
import { Icon, Button, Modal } from 'antd';
import { ExportDatabaseButton } from './DatabaseEditor';
import './DatabaseEditor.css';
import { AsyncError } from '../../utils';
import routes from '../../constants/routes';
import { useChangeRoute } from '../Project/Project';

const SavingDatabaseModal = ({ visible, hideModal, error, success }) => {
  const goToScript = useChangeRoute(`${routes.TOOLS}/archetypes-mapper`);
  return (
    <Modal
      visible={visible}
      width={800}
      onCancel={hideModal}
      closable={false}
      maskClosable={false}
      destroyOnClose={true}
      footer={
        error ? (
          <Button onClick={hideModal}>Back</Button>
        ) : success ? (
          [
            <Button key="back" onClick={hideModal}>
              Back
            </Button>,
            <ExportDatabaseButton key="export" />,
            <Button key="script" type="primary" onClick={goToScript}>
              Go to Archetypes Mapper
            </Button>,
          ]
        ) : null
      }
    >
      {error ? (
        <div>
          <AsyncError error={error} />
          <b>
            <i>Changes were not saved</i>
          </b>
        </div>
      ) : !success ? (
        <div>
          <Icon type="loading" style={{ color: 'blue', margin: 5 }} />
          <span>Saving Databases</span>
        </div>
      ) : (
        <div>
          <h2>Changes Saved!</h2>
          <p>You can now export this database to a desired path.</p>
          <p>
            Remember to run <i>Archetypes Mapper</i> to map properties from this
            database to your geometries.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default SavingDatabaseModal;
