import { Button, Form, Input, Modal, Tooltip, Select } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMemo, useCallback } from 'react';
import {
  useGetDatabaseColumnChoices,
  useAddDatabaseRow,
} from 'features/database-editor/stores/databaseEditorStore';

/**
 * Hook to create an empty row with a unique index
 */
const useAddEmptyRow = (data, dataKey, index, schema) => {
  const addDatabaseRow = useAddDatabaseRow();

  return useCallback(() => {
    if (!index) {
      return null;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    // Get existing indices to ensure uniqueness
    const existingIndices = Array.isArray(data)
      ? data.map((row) => row?.[index])
      : Object.keys(data || {});

    // Generate a unique index name
    let newIndex = 'NEW_ROW';
    let counter = 1;
    while (existingIndices.includes(newIndex)) {
      newIndex = `NEW_ROW_${counter}`;
      counter++;
    }

    // Create empty row with all required fields
    const newRow = { [index]: newIndex };

    // Get columns from schema if available, otherwise infer from existing data
    let columns = [];
    if (schema?.columns) {
      columns = Object.keys(schema.columns);
    } else {
      // Infer columns from first row of existing data
      const firstRow = Array.isArray(data) ? data[0] : Object.values(data)[0];
      if (firstRow && typeof firstRow === 'object') {
        columns = Object.keys(firstRow);
      }
    }

    // Initialize all other columns with default values
    columns.forEach((col) => {
      if (col !== index) {
        if (schema?.columns?.[col]) {
          const colSchema = schema.columns[col];
          const type = colSchema?.type;

          // Set default values based on type
          if (type === 'float' || type === 'int') {
            newRow[col] = 0;
          } else if (colSchema?.choice) {
            // Use first available choice or empty string
            const values = colSchema.choice?.values || [];
            newRow[col] = values.length > 0 ? values[0] : '';
          } else {
            newRow[col] = '';
          }
        } else {
          // No schema - infer type from existing data
          const firstRow = Array.isArray(data)
            ? data[0]
            : Object.values(data)[0];
          const sampleValue = firstRow?.[col];

          if (typeof sampleValue === 'number') {
            newRow[col] = 0;
          } else {
            newRow[col] = '';
          }
        }
      }
    });

    addDatabaseRow(dataKey, index, newRow);

    return newRow;
  }, [data, dataKey, index, schema, addDatabaseRow]);
};

export const AddRowButton = ({ data, dataKey, index, schema, onAddRow }) => {
  const addEmptyRow = useAddEmptyRow(data, dataKey, index, schema);

  const handleClick = () => {
    const newRow = addEmptyRow();
    if (newRow && onAddRow) {
      onAddRow(newRow);
    }
  };

  return (
    <Button icon={<PlusOutlined />} onClick={handleClick}>
      Add Row
    </Button>
  );
};

// eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fieldColumns = useMemo(() => {
    if (!schema?.columns) return [];
    const columns = Object.keys(schema.columns);
    const allFields = [index, ...columns.filter((col) => col !== index)];
    const result = [];
    for (let i = 0; i < allFields.length; i += MAX_ROWS_PER_COLUMN) {
      result.push(allFields.slice(i, i + MAX_ROWS_PER_COLUMN));
    }
    return result;
  }, [index, schema?.columns]);
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
