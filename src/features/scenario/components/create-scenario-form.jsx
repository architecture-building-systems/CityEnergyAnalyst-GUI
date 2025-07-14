import { Button, Steps } from 'antd';
import { memo, useEffect, useRef, useState } from 'react';
import NameForm from 'features/scenario/components/CreateScenarioForms/NameForm';
import GeometryForm from 'features/scenario/components/CreateScenarioForms/GeometryForm';
import ContextForm from 'features/scenario/components/CreateScenarioForms/ContextForm';
import {
  useCreateScenario,
  useFetchDatabases,
  useFetchWeather,
} from 'features/scenario/hooks/create-scenario-forms';

import routes from 'constants/routes.json';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useOpenScenario } from 'features/project/hooks';
import { CreateScenarioProgressModal } from './progress-modal';

export const CreateScenarioForm = memo(function CreateScenarioForm({
  formIndex,
  onFormChange,
}) {
  const timeoutRef = useRef();

  const project = useProjectStore((state) => state.project);
  const openScenario = useOpenScenario(routes.PROJECT);

  const { setFormData, fetching, error } = useCreateScenario(project, {
    // Redirect to input editor when scenario is created
    onSuccess: ({ scenario_name }) => {
      setSuccess(true);
      // Delay before redirecting to input editor
      timeoutRef.current = setTimeout(
        () => openScenario(project, scenario_name),
        2000,
      );
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState({});
  const databases = useFetchDatabases();
  const weather = useFetchWeather();

  const goToScenario = () => {
    openScenario(project, data.scenario_name);
  };

  const onChange = (values) => {
    setData((prev) => ({ ...prev, ...values }));
  };

  const onBack = () => {
    onFormChange((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const onFinish = (values) => {
    if (formIndex < forms.length - 1) {
      setData((prev) => ({ ...prev, ...values }));
      onFormChange((prev) => prev + 1);
    } else {
      setData((prev) => {
        const allFormData = { ...prev, ...values };
        setSuccess(false);
        setFormData(allFormData);
        return allFormData;
      });
      setShowModal(true);
    }
  };

  const FormButtons = () => {
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 24,
          flexDirection: 'row-reverse',
        }}
      >
        <Button type="primary" htmlType="submit" style={{ width: 100 }}>
          {formIndex === forms.length - 1 ? 'Finish' : 'Next'}
        </Button>
        {formIndex > 0 && (
          <Button style={{ width: 100 }} onClick={onBack}>
            Back
          </Button>
        )}
      </div>
    );
  };

  const forms = [
    {
      description: 'Name',
      content: (
        <NameForm
          initialValues={data}
          onFinish={onFinish}
          formButtons={<FormButtons />}
        />
      ),
    },
    {
      description: 'Buildings',
      content: (
        <GeometryForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          formButtons={<FormButtons />}
        />
      ),
    },
    {
      description: 'Context',
      content: (
        <ContextForm
          databases={databases}
          weather={weather}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          formButtons={<FormButtons />}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 24,
        boxSizing: 'border-box',
        border: '1px solid #eee',
        borderRadius: 8,
        minWidth: 600,
        background: '#fff',
        marginLeft: 24,
      }}
    >
      <div>
        <h2>Create Scenario</h2>
        <p>Adds a new Scenario to the current Project.</p>
        <div style={{ marginTop: 48 }}>
          <Steps
            current={formIndex}
            labelPlacement="vertical"
            items={forms}
            size="small"
          />
        </div>
      </div>
      <div style={{ flexGrow: 1 }}>{forms[formIndex].content}</div>
      <CreateScenarioProgressModal
        showModal={showModal}
        setShowModal={setShowModal}
        success={success}
        error={error}
        fetching={fetching}
        onOk={goToScenario}
      />
    </div>
  );
});
