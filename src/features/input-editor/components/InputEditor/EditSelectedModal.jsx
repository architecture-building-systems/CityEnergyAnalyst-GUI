import { Modal, Input, Select, Form } from 'antd';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { INDEX_COLUMN } from 'features/input-editor/constants';
import { useUpdateInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';

const EditSelectedModal = ({
  visible,
  setVisible,
  inputTable,
  table,
  columns,
}) => {
  const [form] = Form.useForm();

  const updateInputData = useUpdateInputs();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let updates = [];
      console.log(values);
      for (const prop in values) {
        values[prop] && updates.push({ property: prop, value: values[prop] });
      }
      updateInputData(
        table,
        inputTable.getSelectedData().map((data) => data[INDEX_COLUMN]),
        updates,
      );
      setVisible(false);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title={`Edit ${table} Table`}
      open={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnHidden
    >
      <div style={{ overflow: 'auto', maxHeight: 400 }}>
        <InputDataForm
          form={form}
          inputTable={inputTable}
          table={table}
          columns={columns}
        />
      </div>
      <details style={{ marginTop: 15 }}>
        <summary>Show selected data table</summary>
        <Table inputTable={inputTable} />
      </details>
    </Modal>
  );
};

const Table = ({ inputTable }) => {
  return (
    <div style={{ overflow: 'auto', maxHeight: 200 }}>
      <table>
        <tbody>
          <tr>
            {inputTable.getColumnDefinitions().map((columnDef) => (
              <th style={{ padding: '0 15px' }} key={columnDef.title}>
                {columnDef.title}
              </th>
            ))}
          </tr>
          {inputTable
            .getSelectedData()
            .sort((a, b) => (a[INDEX_COLUMN] > b[INDEX_COLUMN] ? 1 : -1))
            .map((data) => {
              const row = inputTable.getColumnDefinitions().map((columnDef) => (
                <td style={{ padding: '0 15px' }} key={columnDef.title}>
                  {data[columnDef.title]}
                </td>
              ));
              return <tr key={data[INDEX_COLUMN]}>{row}</tr>;
            })}
        </tbody>
      </table>
    </div>
  );
};

const InputDataForm = ({ form, inputTable, table, columns }) => {
  return (
    <Form form={form}>
      {inputTable.getColumnDefinitions().map((columnDef) => {
        const { title } = columnDef;
        if (title != INDEX_COLUMN && title != 'REFERENCE')
          return (
            <Form.Item
              key={title}
              name={title}
              label={title}
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 11, offset: 1 }}
              extra={
                <small style={{ display: 'block', lineHeight: 'normal' }}>
                  {columns[table][title].description}
                </small>
              }
              {...createFormItemConfig(title, columns[table][title])}
            >
              {createFormItemInput(title, columns[table][title])}
            </Form.Item>
          );
      })}
    </Form>
  );
};

const createFormItemInput = (title, columnInfo) => {
  // Choices Field
  const choices = columnInfo?.choices;
  if (choices) {
    const Options = choices.map(({ value, label }) => (
      <Select.Option key={value} value={value}>
        {`${value} : ${label}`}
      </Select.Option>
    ));
    return (
      <Select placeholder="unchanged" allowClear={true}>
        {Options}
      </Select>
    );
  }

  return <Input placeholder="unchanged" />;
};

const createFormItemConfig = (title, columnInfo) => {
  const { type } = columnInfo;

  // Choices Field - no validation needed
  const choices = columnInfo?.choices;
  if (choices) {
    return { rules: [] };
  }

  const typeMap = {
    string: 'string',
    int: 'integer',
    float: 'float',
    year: 'integer',
  };

  const checkNumeric = (value, type) => {
    if (type == 'string') return value;
    if (value === undefined || value == '') return 0;
    const regex =
      type === 'int' ? /^([1-9][0-9]*|0)$/ : /^([1-9][0-9]*|0)(\.\d+)?$/;
    return regex.test(value) ? Number(value) : NaN;
  };

  const fieldType = type == 'string' ? 'string' : 'number';

  return {
    rules: [
      {
        type: fieldType,
        message: `${title} is not a ${typeMap[type]}`,
        transform: (value) => checkNumeric(value, type),
      },
      {
        validator: async (_, value) => {
          if (typeof value != 'undefined') {
            // Check constraints
            const constraints = columnInfo?.constraints;
            if (columnInfo?.constraints) {
              if (constraints?.max) {
                if (type != 'string' && value > constraints.max) {
                  throw new Error(`Max value: ${constraints.max}`);
                }
              }
            }

            // Check regex
            if (type == 'string' && columnInfo?.regex) {
              const regex = new RegExp(columnInfo.regex);
              if (!regex.test(value)) {
                throw new Error(
                  columnInfo?.example
                    ? `${title} is not in the right format. e.g. ${columnInfo.example}`
                    : `Does not fit expression: ${regex}`,
                );
              }
            }
          }
        },
      },
    ],
  };
};

export default EditSelectedModal;
