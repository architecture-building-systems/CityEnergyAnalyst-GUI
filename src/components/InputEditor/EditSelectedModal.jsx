import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form } from '@ant-design/compatible';
import { Modal, Input, Select } from 'antd';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { updateInputData } from '../../actions/inputEditor';
import { INDEX_COLUMN } from './constants';

const EditSelectedModal = ({ visible, setVisible, inputTable, table }) => {
  const dispatch = useDispatch();
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        let updates = [];
        console.log(values);
        for (const prop in values) {
          values[prop] && updates.push({ property: prop, value: values[prop] });
        }
        dispatch(
          updateInputData(
            table,
            inputTable.getSelectedData().map((data) => data[INDEX_COLUMN]),
            updates,
          ),
        );
        setVisible(false);
      }
    });
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
      destroyOnClose
    >
      <div style={{ overflow: 'auto', maxHeight: 400 }}>
        <InputDataForm ref={formRef} inputTable={inputTable} table={table} />
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

const InputDataForm = Form.create()(({ form, inputTable, table }) => {
  const { columns } = useSelector((state) => state.inputData);
  return (
    <Form>
      {inputTable.getColumnDefinitions().map((columnDef) => {
        const { title } = columnDef;
        if (title != INDEX_COLUMN && title != 'REFERENCE')
          return (
            <Form.Item
              key={title}
              label={title}
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 11, offset: 1 }}
            >
              {createFormItem(form, title, columns[table][title])}
              <small style={{ display: 'block', lineHeight: 'normal' }}>
                {columns[table][title].description}
              </small>
            </Form.Item>
          );
      })}
    </Form>
  );
});

const createFormItem = (form, title, columnInfo) => {
  const { type } = columnInfo;

  // Choices Field
  const choices = columnInfo?.choices;
  if (choices) {
    const Options = choices.map(({ value, label }) => (
      <Select.Option key={value} value={value}>
        {`${value} : ${label}`}
      </Select.Option>
    ));
    return form.getFieldDecorator(title)(
      <Select placeholder="unchanged" allowClear={true}>
        {Options}
      </Select>,
    );
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
  return form.getFieldDecorator(title, {
    rules: [
      {
        type: fieldType,
        message: `${title} is not a ${typeMap[type]}`,
        transform: (value) => checkNumeric(value, type),
      },
      {
        validator: (rule, value, callback) => {
          try {
            if (typeof value != 'undefined') {
              // Check contraints
              const constraints = columnInfo?.constraints;
              if (columnInfo?.constraints) {
                if (constraints?.max) {
                  if (type != 'string' && value > constraints.max)
                    return new Error(`Max value: ${constraints.max}`);
                }
              }

              // Check regex
              if (type == 'string' && columnInfo?.regex) {
                const regex = new RegExp(columnInfo.regex);
                if (!regex.test(value)) {
                  return new Error(
                    columnInfo?.example
                      ? `${title} is not in the right format. e.g. ${columnInfo.example}`
                      : `Does not fit expression: ${regex}`,
                  );
                }
              }
            }
            callback();
          } catch (err) {
            callback(err);
          }
        },
      },
    ],
  })(<Input placeholder="unchanged" />);
};

export default EditSelectedModal;
