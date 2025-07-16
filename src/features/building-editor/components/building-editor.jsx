import { useSelected } from 'features/input-editor/stores/inputEditorStore';
import { useBuildingData } from '../hooks/building-data';
import { Divider, Input, Form, Select } from 'antd';
import { FormItemWrapper } from 'features/tools/components/Tools/Parameter';
import { useEffect } from 'react';

const InputItem = ({ form, property, initialValue, description }) => {
  return (
    <FormItemWrapper
      form={form}
      name={property}
      initialValue={initialValue}
      help={description}
      inputComponent={<Input />}
    />
  );
};

const SelectItem = ({ form, property, initialValue, description, choices }) => {
  const options = choices?.map(({ value }) => ({
    label: value,
    value,
  }));

  return (
    <FormItemWrapper
      form={form}
      name={property}
      initialValue={initialValue}
      help={description}
      inputComponent={<Select options={options} />}
    />
  );
};

const CategoryForm = ({ data, columns, form, category }) => {
  const properties = data?.[category];

  if (properties == undefined) return null;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* <h3>{category}</h3> */}

      {Object.keys(properties).map((property) => {
        if (property == 'reference') return null;

        const initialValue = properties[property];
        const columnProperties = columns?.[category]?.[property];
        console.log('columnProperties', columnProperties);

        return (
          <div key={property}>
            {columnProperties?.choices ? (
              <SelectItem
                form={form}
                property={property}
                initialValue={initialValue}
                description={columnProperties?.description}
                choices={columnProperties.choices}
              />
            ) : (
              <InputItem
                form={form}
                property={property}
                initialValue={initialValue}
                description={columnProperties?.description}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const BuildingEditor = () => {
  const [form] = Form.useForm();
  const buildings = useSelected();
  const building = buildings?.[0];

  // Get first building for now
  const { data, columns, updateData } = useBuildingData(building);

  useEffect(() => {
    form.resetFields(); // Reset form when buildings change
  }, [form, buildings]);

  useEffect(() => {
    if (data?.zone) {
      // Set form values when data changes
      const formValues = Object.keys(data.zone).reduce((acc, key) => {
        acc[key] = data.zone[key];
        return acc;
      }, {});

      form.setFieldsValue(formValues);
    }
  }, [form, data]);

  const onValuesChange = (changedValues) => {
    console.log('changedValues', changedValues, building);
    if (!building) return;

    updateData(
      'zone',
      [building],
      Object.keys(changedValues).map((key) => ({
        property: key,
        value: changedValues[key],
      })),
    );
  };

  return (
    <div
      style={{
        height: '100%',
        padding: 12,

        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div>
        <div>{building}</div>
      </div>

      <Divider />

      {buildings?.length > 0 ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Form
            form={form}
            labelCol={{ span: 6 }}
            onValuesChange={onValuesChange}
          >
            <CategoryForm
              category="zone"
              data={data}
              columns={columns}
              form={form}
            />
          </Form>
        </div>
      ) : (
        <div>Select a building on the map to view its properties</div>
      )}
    </div>
  );
};
