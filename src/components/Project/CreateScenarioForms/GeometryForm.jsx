import { Form, Input, Button } from 'antd';
import { useState } from 'react';

const UserGeometryForm = ({ initialValues, onBack, onFinish, setGeojson }) => {
  return (
    <Form initialValues={initialValues} onFinish={onFinish} layout="vertical">
      <Form.Item
        label="Path to building geometry"
        name={['user', 'zone']}
        extra="Link to a path to building geometries in .shp format. See an example here."
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Path to (surrounding)building geometry"
        name={['user', 'surroundings']}
        extra="Link to a path to surrounding building geometries in .shp format. See an example here."
      >
        <Input />
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ padding: '0 36px' }}
          >
            Next
          </Button>
          <Button style={{ padding: '0 36px' }} onClick={onBack}>
            Back
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

const GeometryForm = ({ initialValues, onBack, onFinish, setGeojson }) => {
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState({});

  const onUserGeomertyFormFinish = (values) => {
    if (data.user.zone_path && data.user.surroundings_path) {
      onFinish(values);
    } else {
      setData({ ...data, ...values });
      setCurrent(current + 1);
    }
  };

  const forms = [
    <UserGeometryForm
      initialValues={initialValues}
      onFinish={onUserGeomertyFormFinish}
    />,
  ];

  return <>{forms[current]}</>;
};

export default GeometryForm;
