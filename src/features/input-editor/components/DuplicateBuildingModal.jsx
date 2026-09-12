import { Button, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import { getValidateBuildingNameFunc } from 'utils/project';
import { suggestDuplicateName } from 'features/input-editor/hooks/updates/useUpdateInputs';

/**
 * Name the copy before it is made.
 *
 * Mirrors `DuplicateScenarioModal`: pre-fill a suggestion, let the user change it, validate on
 * submit. Naming up front rather than afterwards because the `name` column is the table's index
 * and is not editable in place -- a copy created with a name the user did not want could not
 * then be renamed.
 *
 * The copy is local until the scenario is saved, so this dialog only edits the pending change
 * set; nothing reaches disk here.
 */
const DuplicateBuildingModal = ({
  visible,
  setVisible,
  building,
  existingNames,
  onDuplicate,
}) => {
  const [form] = Form.useForm();

  const suggestion = building
    ? suggestDuplicateName(building, new Set(existingNames))
    : '';

  useEffect(() => {
    if (visible) form.setFieldsValue({ building_name: suggestion });
  }, [form, visible, suggestion]);

  const onFinish = ({ building_name: name }) => {
    onDuplicate(name.trim());
    setVisible(false);
  };

  return (
    <Modal
      open={visible}
      onCancel={() => setVisible(false)}
      closable={false}
      title={`Duplicate ${building}`}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button onClick={() => setVisible(false)}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            Duplicate
          </Button>
        </div>
      }
    >
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item
          label="Name of the new building"
          name="building_name"
          rules={[
            { required: true, message: 'Give the new building a name.' },
            { validator: getValidateBuildingNameFunc(existingNames) },
          ]}
        >
          <Input onPressEnter={() => form.submit()} />
        </Form.Item>
        <p style={{ color: '#64748b', marginBottom: 0 }}>
          The copy keeps the same footprint and archetype. CEA regenerates its
          envelope, HVAC, comfort, loads and supply when you save.
        </p>
      </Form>
    </Modal>
  );
};

export default DuplicateBuildingModal;
