import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Button, Form, Input } from 'antd';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { updateInputData } from '../../actions/inputEditor';

const EditSelectedModal = ({ visible, setVisible, inputTable, table }) => {
  const dispatch = useDispatch();
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        let updates = [];
        for (const prop in values) {
          values[prop] !== null &&
            updates.push({ property: prop, value: values[prop] });
        }
        dispatch(
          updateInputData(
            table,
            inputTable.getSelectedData().map(data => data.Name),
            updates
          )
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
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose
    >
      <details style={{ padding: 15 }}>
        <summary>Selected Data Table</summary>
        <Table inputTable={inputTable} />
      </details>
      <InputDataForm ref={formRef} inputTable={inputTable} table={table} />
    </Modal>
  );
};

const Table = ({ inputTable }) => {
  return (
    <div style={{ overflow: 'auto' }}>
      <table>
        <tr>
          {inputTable.getColumnDefinitions().map(columnDef => (
            <th style={{ padding: '0 15px' }} key={columnDef.title}>
              {columnDef.title}
            </th>
          ))}
        </tr>
        {inputTable.getSelectedData().map(data => {
          const row = inputTable.getColumnDefinitions().map(columnDef => (
            <td style={{ padding: '0 15px' }} key={columnDef.title}>
              {data[columnDef.title]}
            </td>
          ));
          return <tr key={data.Name}>{row}</tr>;
        })}
      </table>
    </div>
  );
};

const InputDataForm = Form.create()(({ form, inputTable, table }) => {
  const { columns } = useSelector(state => state.inputData);
  const typeMap = { str: 'string', int: 'integer', float: 'float' };
  const checkNumeric = (value, type) => {
    if (type == 'str') return value;
    if (value === null) return 0;
    const regex =
      type === 'int' ? /^(?:[1-9][0-9]*|0)$/ : /^(?:[1-9][0-9]*|0)(\.\d+)?$/;
    return regex.test(value) ? Number(value) : NaN;
  };

  return (
    <Form>
      {inputTable.getColumnDefinitions().map(columnDef => {
        if (columnDef.title != 'Name' && columnDef.title != 'REFERENCE')
          return (
            <Form.Item
              key={columnDef.title}
              label={columnDef.title}
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 11, offset: 1 }}
            >
              {form.getFieldDecorator(columnDef.title, {
                initialValue: null,
                rules: [
                  {
                    type:
                      typeMap[columns[table][columnDef.title].type] == 'string'
                        ? 'string'
                        : 'number',
                    message: `${columnDef.title} is not a ${
                      typeMap[columns[table][columnDef.title].type]
                    }`,
                    transform: value =>
                      checkNumeric(value, columns[table][columnDef.title].type)
                  }
                ]
              })(<Input placeholder="unchanged" />)}
              <small style={{ display: 'block', lineHeight: 'normal' }}>
                {columns[table][columnDef.title].description}
              </small>
            </Form.Item>
          );
      })}
    </Form>
  );
});

export default EditSelectedModal;
