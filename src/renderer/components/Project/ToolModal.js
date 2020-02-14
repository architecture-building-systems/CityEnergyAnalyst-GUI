import React from 'react';
import { useSelector } from 'react-redux';
import { Modal, Button, message } from 'antd';
import Tool from '../Tools/Tool';

const ToolModal = ({ tool, visible, setVisible }) => {
  const error = useSelector(state => state.toolSaving.error);
  const hideModal = () => {
    setVisible(false);
  };

  const formButtons = ({ getForm, saveParams, setDefault }) => {
    message.config({
      top: 120
    });

    const saveToConfig = async () => {
      let values = getForm();
      if (values) {
        const { scenario, ...params } = values;
        await saveParams(params);
        if (error === null) {
          message.success('Settings saved to config');
          hideModal();
        } else {
          message.error('Something went wrong');
        }
      }
    };

    const saveDefault = async () => {
      await setDefault();
      if (error === null) {
        message.success('Settings have been reverted to defaults');
      }
    };

    return (
      <React.Fragment>
        <Button onClick={hideModal}>Cancel</Button>
        <Button type="primary" onClick={saveDefault}>
          Load default settings
        </Button>
        <Button type="primary" onClick={saveToConfig}>
          Save & Close
        </Button>
      </React.Fragment>
    );
  };

  return (
    <Modal
      visible={visible}
      width={800}
      footer={false}
      onCancel={hideModal}
      closable={false}
      destroyOnClose
    >
      <div id="cea-tool-modal">
        <Tool script={tool} formButtons={formButtons}></Tool>
      </div>
    </Modal>
  );
};

export default ToolModal;
