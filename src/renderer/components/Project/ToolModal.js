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
      if (getForm()) {
        await saveParams();
        if (error === null) {
          message.success('Settings saved to config');
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
        <Button onClick={hideModal}>Back</Button>
        <Button type="primary" onClick={saveToConfig}>
          Save to Config
        </Button>
        <Button type="primary" onClick={saveDefault}>
          Default
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
