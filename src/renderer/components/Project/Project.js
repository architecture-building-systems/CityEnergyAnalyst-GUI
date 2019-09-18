import React, { useState, useEffect } from 'react';
import { useAsyncData } from '../../utils/hooks';
import { Card, Icon, Row, Col, Button, Popconfirm } from 'antd';
import axios from 'axios';

const Project = () => {
  const [fetch, setFetchProject] = useState(false);
  const [project, isLoading] = useAsyncData(
    'http://localhost:5050/api/project',
    {
      name: null,
      scenario: null,
      scenarios: []
    },
    [fetch]
  );

  const fetchProject = () => {
    setFetchProject(x => !x);
  };

  if (isLoading) return 'Loading';
  const { name, scenario, scenarios } = project;

  return (
    <div>
      <Card
        title={<h2 style={{ display: 'inline' }}>{name}</h2>}
        bordered={false}
      >
        <Button type="primary" style={{ display: 'block', marginLeft: 'auto' }}>
          New Scenario
        </Button>
        {scenarios.map(scenario => (
          <ScenarioCard
            key={scenario}
            scenario={scenario}
            fetchProject={fetchProject}
          />
        ))}
      </Card>
    </div>
  );
};

const ScenarioCard = ({ scenario, fetchProject }) => {
  const [image, isLoading, error] = useAsyncData(
    `http://localhost:5050/api/project/${scenario}/image`
  );

  const onConfirm = async () => {
    try {
      const resp = await axios.delete(
        `http://localhost:5050/api/project/${scenario}`
      );
      console.log(resp.data);
      fetchProject();
    } catch (err) {
      console.log(err.response);
    }
  };

  return (
    <Card
      title={scenario}
      style={{ marginTop: 16 }}
      type="inner"
      actions={[
        <Popconfirm
          title="Are you sure delete this scenario?"
          onConfirm={onConfirm}
          okText="Yes"
          cancelText="No"
          key="delete"
        >
          <Icon type="delete" />
        </Popconfirm>,
        <Icon type="edit" key="edit" />,
        <Icon type="folder-open" key="open" />
      ]}
    >
      <Row>
        <Col span={6}>
          <div
            style={{
              width: 256,
              height: 160,
              backgroundColor: '#eee',
              textAlign: 'center',
              textJustify: 'center'
            }}
          >
            {isLoading ? null : error ? (
              'Unable to generate image'
            ) : (
              <img src={`data:image/png;base64,${image.image}`} />
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default Project;
