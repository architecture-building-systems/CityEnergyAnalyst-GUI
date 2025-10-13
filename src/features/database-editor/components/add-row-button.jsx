import { Button, Form, Input, Modal, Tooltip, Select } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import {
  useGetDatabaseColumnChoices,
  useAddDatabaseRow,
} from 'features/database-editor/stores/databaseEditorStore';

export const AddRowButton = ({ dataKey, index, schema, onAddRow }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Button icon={<PlusOutlined />} onClick={() => setVisible(true)}>
        Add Row
      </Button>
      <AddRowModalForm
        dataKey={dataKey}
        index={index}
        schema={schema}
        visible={visible}
        setVisible={setVisible}
        onAddRow={onAddRow}
      />
    </div>
  );
};

const AddRowModalForm = ({
  dataKey,
  index,
  schema,
  visible,
  setVisible,
  onAddRow,
}) => {
  const [form] = Form.useForm();
  const getColumnChoices = useGetDatabaseColumnChoices();
  const addDatabaseRow = useAddDatabaseRow();

  const MAX_ROWS_PER_COLUMN = 20;

  // Split fields into columns with max 8 rows each
  const fieldColumns = useMemo(() => {
    if (!schema?.columns) return [];
    const columns = Object.keys(schema.columns);
    const allFields = [index, ...columns.filter((col) => col !== index)];
    const result = [];
    for (let i = 0; i < allFields.length; i += MAX_ROWS_PER_COLUMN) {
      result.push(allFields.slice(i, i + MAX_ROWS_PER_COLUMN));
    }
    return result;
  }, [index, MAX_ROWS_PER_COLUMN, schema?.columns]);
  const numColumns = fieldColumns.length;

  const onOk = () => {
    form.submit();
  };

  const onCancel = () => {
    setVisible(false);
    form.resetFields();
  };

  const handleFinish = (values) => {
    // Add row to the store
    addDatabaseRow(dataKey, index, values);

    // Call the optional callback if provided
    if (onAddRow) {
      onAddRow(values);
    }

    setVisible(false);
    form.resetFields();
  };

  const renderFormItem = (col) => {
    const description = schema.columns[col]?.description;
    const type = schema.columns[col]?.type;
    const choice = schema.columns[col]?.choice;
    const isIndex = col === index;

    const label = (
      <span>
        {col}
        {description && (
          <Tooltip title={description}>
            <InfoCircleOutlined
              style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 12 }}
            />
          </Tooltip>
        )}
      </span>
    );

    const rules = [{ required: true, message: `Please input ${col}` }];

    // Add type validation for float fields
    if (type === 'float') {
      rules.push({
        validator: (_, value) => {
          if (!value) return Promise.resolve();
          const num = Number(value);
          if (isNaN(num)) {
            return Promise.reject(new Error('Must be a valid number'));
          }
          return Promise.resolve();
        },
      });
    }

    // Render Select if choice property exists
    if (choice != undefined) {
      const values = choice?.values || [];
      const lookup = choice?.lookup;
      const columnChoices = lookup
        ? getColumnChoices(lookup?.path, lookup?.column)
        : values;

      // Guard against null/undefined columnChoices from failed lookups
      if (!columnChoices) {
        return (
          <Form.Item key={col} label={label} name={col} rules={rules}>
            <Select
              placeholder={`No options available for ${col.toLowerCase()}`}
              disabled
            />
          </Form.Item>
        );
      }

      // Handle both array and object choices
      const isObjectChoices = !Array.isArray(columnChoices);
      const options = Array.isArray(columnChoices)
        ? columnChoices.map((value) => ({ label: value, value: value }))
        : Object.keys(columnChoices).map((key) => ({
            label: key,
            value: key,
          }));

      return (
        <Form.Item key={col} label={label} name={col} rules={rules}>
          <Select
            placeholder={`Select ${col.toLowerCase()}`}
            options={options}
            showSearch
            optionFilterProp="label"
            popupMatchSelectWidth={false}
            optionRender={
              isObjectChoices
                ? (option) => `${option.value} : ${columnChoices[option.value]}`
                : undefined
            }
          />
        </Form.Item>
      );
    }

    return (
      <Form.Item
        key={col}
        label={label}
        name={col}
        rules={rules}
        normalize={isIndex ? (value) => value?.toUpperCase() : undefined}
      >
        <Input placeholder={`Enter ${col.toLowerCase()}`} />
      </Form.Item>
    );
  };

  if (!schema?.columns) return null;

  return (
    <Modal
      title="Add New Row"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="Add"
      cancelText="Cancel"
      width={720}
      styles={{
        body: {
          paddingTop: 24,
        },
      }}
    >
      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        requiredMark="optional"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
            gap: '0 24px',
          }}
        >
          {fieldColumns.map((columnFields, columnIndex) => (
            <div key={columnIndex}>
              {columnFields.map((field) => renderFormItem(field))}
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  );
};
