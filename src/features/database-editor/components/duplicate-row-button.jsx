import { Button, Form, Input, Modal, Tooltip, Select } from 'antd';
import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMemo, useCallback } from 'react';
import {
  useGetDatabaseColumnChoices,
  useAddDatabaseRow,
} from 'features/database-editor/stores/databaseEditorStore';

/**
 * Hook to handle duplicating rows by copying selected or last row's values
 * and appending "_copy" to the index value
 */
const useDuplicateRows = (data, dataKey, index, tabulatorRef) => {
  const addDatabaseRow = useAddDatabaseRow();

  return useCallback(() => {
    if (!data || !index) return [];

    let rowsToDuplicate = [];

    // Get selected rows from the table if available
    if (tabulatorRef?.current) {
      const selectedRows = tabulatorRef.current.getSelectedRows();
      if (selectedRows.length > 0) {
        rowsToDuplicate = selectedRows.map((row) => row.getData());
      }
    }

    // Fall back to last row if no rows are selected
    if (rowsToDuplicate.length === 0) {
      let lastRow;
      let lastIndex;

      if (Array.isArray(data)) {
        if (data.length === 0) return [];
        lastRow = data[data.length - 1];
        lastIndex = lastRow?.[index];
      } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return [];
        lastIndex = keys[keys.length - 1];
        lastRow = { [index]: lastIndex, ...data[lastIndex] };
      } else {
        return [];
      }

      if (!lastRow) return [];
      rowsToDuplicate = [lastRow];
    }

    // Get existing indices
    const existingIndices = Array.isArray(data)
      ? data.map((row) => row?.[index])
      : Object.keys(data);

    const newRows = [];

    // Duplicate each row
    rowsToDuplicate.forEach((rowToDuplicate) => {
      const originalIndex = rowToDuplicate[index];
      const newRow = { ...rowToDuplicate };

      // Generate a unique index with "_copy" suffix
      let newIndex = `${originalIndex}_copy`;
      let counter = 1;

      // Ensure the new index is unique
      const allIndices = [...existingIndices, ...newRows.map((r) => r[index])];
      while (allIndices.includes(newIndex)) {
        newIndex = `${originalIndex}_copy${counter}`;
        counter++;
      }

      newRow[index] = newIndex;

      // Add the new row to the database
      addDatabaseRow(dataKey, index, newRow);
      newRows.push(newRow);
    });

    return newRows;
  }, [data, dataKey, index, addDatabaseRow, tabulatorRef]);
};

export const DuplicateRowButton = ({
  data,
  dataKey,
  index,
  tabulatorRef,
  onDuplicateRow,
  selectedCount = 0,
}) => {
  const duplicateRows = useDuplicateRows(data, dataKey, index, tabulatorRef);

  const handleClick = () => {
    const newRows = duplicateRows();
    if (newRows.length > 0 && onDuplicateRow) {
      onDuplicateRow(newRows);
    }
  };

  // Don't show button if no rows are selected
  if (!selectedCount || selectedCount === 0) {
    return null;
  }

  // Show count in button text when multiple rows are selected
  const buttonText =
    selectedCount > 1 ? `Duplicate Row (${selectedCount})` : 'Duplicate Row';

  return (
    <Button icon={<CopyOutlined />} onClick={handleClick}>
      {buttonText}
    </Button>
  );
};

const MAX_ROWS_PER_COLUMN = 20;

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
  }, [index, schema.columns]);
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
