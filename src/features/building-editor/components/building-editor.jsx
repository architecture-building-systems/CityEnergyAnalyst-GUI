import { useSelected } from 'features/input-editor/stores/inputEditorStore';
import { useBuildingData } from '../hooks/building-data';
import { Divider, Input, Form, Select, Collapse } from 'antd';
import { FormField } from 'components/Parameter';
import { useEffect } from 'react';

const InputItem = ({ property, initialValue, description, required }) => {
  return (
    <FormField
      name={property}
      help={description}
      initialValue={initialValue}
      rules={[{ required }]}
    >
      <Input />
    </FormField>
  );
};

const SelectItem = ({
  property,
  initialValue,
  description,
  choices,
  required,
}) => {
  const options = choices?.map(({ value }) => ({
    label: value,
    value,
  }));

  return (
    <FormField
      name={property}
      help={description}
      initialValue={initialValue}
      rules={[{ required }]}
    >
      <Select options={options} />
    </FormField>
  );
};

const CategoryForm = ({ data, columns, category }) => {
  const properties = data?.[category];
  const categoryColumns = columns?.[category];

  if (properties == undefined) return null;
  const others = [];

  const itemFromProperty = (property, required = true) => {
    const initialValue = properties[property];
    const columnProperties = categoryColumns?.[property];

    const description = (
      <div>
        {columnProperties?.description} {columnProperties?.unit}
      </div>
    );

    return (
      <div key={property}>
        {columnProperties?.choices ? (
          <SelectItem
            property={property}
            initialValue={initialValue}
            description={description}
            choices={columnProperties.choices}
            required={required}
          />
        ) : (
          <InputItem
            property={property}
            initialValue={initialValue}
            description={description}
            required={required}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {Object.keys(properties).map((property) => {
        const columnProperties = categoryColumns?.[property];

        if (property == 'reference') return null;
        if (columnProperties?.description == undefined) {
          others.push(property);
          return null;
        }
        return itemFromProperty(property);
      })}

      {others.length > 0 && (
        <Collapse
          items={[
            {
              label: 'Other Properties',
              children: others.map((property) =>
                itemFromProperty(property, false),
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export const BuildingEditor = () => {
  const [form] = Form.useForm();
  const buildings = useSelected();
  const building = buildings?.[0];

  const category = 'zone';

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
    if (!building) return;

    updateData(
      category,
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

        display: 'flex',
        flexDirection: 'column',

        boxSizing: 'border-box',
      }}
    >
      <div>
        <b>{building}</b>
      </div>

      <Divider />

      {buildings?.length > 0 ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Form
            form={form}
            labelCol={{ span: 6 }}
            size="small"
            onValuesChange={onValuesChange}
            labelWrap
          >
            <CategoryForm category={category} data={data} columns={columns} />
          </Form>
        </div>
      ) : (
        <div>Select a building on the map to view its properties</div>
      )}
    </div>
  );
};
