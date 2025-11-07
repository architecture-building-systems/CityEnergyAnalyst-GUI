import {
  CloseOutlined,
  FileImageOutlined,
  FileSearchOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Input,
  Switch,
  Select,
  Divider,
  Button,
  Space,
  Upload,
  Form,
} from 'antd';
import { checkExist } from 'utils/file';
import React, {
  forwardRef,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';

import { isElectron, openDialog } from 'utils/electron';
import { SelectWithFileDialog } from 'features/scenario/components/CreateScenarioForms/FormInput';
import { validateNetworkNameChars } from 'utils/validation';
import { apiClient } from 'lib/api/axios';

// Helper component to standardize Form.Item props
export const FormField = ({ name, help, children, ...props }) => {
  return (
    <Form.Item
      label={<b>{name}</b>}
      wrapperCol={{ offset: 1, span: 22 }}
      key={name}
      name={name}
      extra={<div style={{ fontSize: 12 }}>{help}</div>}
      {...props}
    >
      {children}
    </Form.Item>
  );
};

// Component for NetworkLayoutNameParameter with real-time validation
const NetworkLayoutNameInput = ({
  name,
  help,
  value,
  form,
  nullable,
  allParameters,
}) => {
  const validationTimeoutRef = useRef(null);
  const justClearedRef = useRef(false); // Track if field was just cleared programmatically
  const [validationState, setValidationState] = useState({
    status: '', // '', 'validating', 'success', 'error'
    message: '',
  });
  const [currentValue, setCurrentValue] = useState(value || '');

  // Get scenario from allParameters (it's not in the form)
  const scenarioParam = allParameters?.find(
    (p) => p.type === 'ScenarioParameter',
  );
  const scenarioValue = scenarioParam?.value;

  // Watch for external form value changes using polling (simple approach)
  useEffect(() => {
    const interval = setInterval(() => {
      const formValue = form.getFieldValue(name);
      if ((formValue || '') !== currentValue) {
        // Field was changed externally
        if (!formValue || formValue.trim() === '') {
          // Field was cleared - set flag to prevent validation
          justClearedRef.current = true;
        }
        setCurrentValue(formValue || '');
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [form, name, currentValue]);

  // Clear validation state when value becomes empty
  useEffect(() => {
    if (!currentValue || currentValue.trim() === '') {
      setValidationState({ status: '', message: '' });
      // Don't trigger validation if we just cleared
      if (justClearedRef.current) {
        justClearedRef.current = false;
      }
    }
  }, [currentValue]);

  // Trigger form validation when validation state changes (but not when clearing)
  useEffect(() => {
    // Don't trigger if field was just cleared
    if (justClearedRef.current) {
      return;
    }

    // Only trigger validation if we have a non-empty value
    // This prevents re-triggering validation when field is cleared
    if (currentValue && currentValue.trim() !== '') {
      if (
        validationState.status === 'success' ||
        validationState.status === 'error'
      ) {
        // Trigger field validation to update the UI
        form.validateFields([name]).catch(() => {
          // Ignore validation errors - they'll be displayed by the form
        });
      }
    }
  }, [
    validationState.status,
    validationState.message,
    form,
    name,
    currentValue,
  ]);

  // Debounced backend validation
  const validateWithBackend = useCallback(
    (value) => {
      console.log('validateWithBackend called with value:', value);

      // Clear any pending validation
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        console.log('Cleared previous timeout');
      }

      // Blank/empty is valid (will auto-generate timestamp)
      if (!value || !value.trim()) {
        console.log('Value is blank, skipping validation');
        setValidationState({ status: '', message: '' });
        return;
      }

      console.log('Setting timeout for validation...');

      // Don't show "validating" state immediately - wait for debounce
      // This prevents the annoying flicker on every keystroke

      // Debounce backend validation by 1000ms (longer delay)
      validationTimeoutRef.current = setTimeout(async () => {
        console.log('Timeout fired! Starting validation...');
        // Now show validating state
        setValidationState({ status: 'validating', message: '' });

        try {
          // Get scenario from allParameters (not in form)
          const scenario = scenarioValue;

          // Get network-type from form
          const formValues = form.getFieldsValue();
          const networkType = formValues['network-type'];

          console.log('Form values:', formValues);
          console.log('scenario:', scenario);
          console.log('network-type:', networkType);

          // Skip backend validation if dependencies aren't set
          if (!scenario || !networkType) {
            console.log(
              'Skipping validation - missing scenario or network-type',
            );
            setValidationState({ status: '', message: '' });
            return;
          }

          // Check if network folder exists
          // Format: {scenario}/outputs/data/thermal-network/{DC|DH}/{network-name}/
          const trimmedValue = value.trim();
          const networkPath = `${scenario}/outputs/data/thermal-network/${networkType}/${trimmedValue}`;

          console.log('Checking network path:', networkPath);

          try {
            // Check if the network folder exists using /api/contents
            await apiClient.get('/api/contents', {
              params: {
                content_path: networkPath,
                content_type: 'directory',
              },
            });

            // If we got here (no error), the folder exists
            console.log('Network folder exists!');

            // Check if it contains network files (edges.shp or nodes.shp)
            try {
              const edgesPath = `${networkPath}/edges.shp`;
              const nodesPath = `${networkPath}/nodes.shp`;

              // Try to check for edges.shp
              let hasEdges = false;
              let hasNodes = false;

              try {
                await apiClient.get('/api/contents', {
                  params: { content_path: edgesPath, content_type: 'file' },
                });
                hasEdges = true;
              } catch (e) {
                // edges.shp doesn't exist
              }

              try {
                await apiClient.get('/api/contents', {
                  params: { content_path: nodesPath, content_type: 'file' },
                });
                hasNodes = true;
              } catch (e) {
                // nodes.shp doesn't exist
              }

              if (hasEdges || hasNodes) {
                // Network exists with actual network files
                setValidationState({
                  status: 'error',
                  message: `Network '${trimmedValue}' already exists for ${networkType}. Choose a different name or delete the existing folder.`,
                });
                return;
              }
            } catch (fileCheckError) {
              console.log('Error checking network files:', fileCheckError);
            }
          } catch (folderCheckError) {
            // Folder doesn't exist - that's good!
            console.log(
              'Network folder does not exist (good):',
              folderCheckError.response?.status,
            );
          }

          // Validation passed - no collision detected
          setValidationState({ status: 'success', message: '' });
        } catch (error) {
          console.error('Validation error:', error);

          // Extract error message from backend
          const errorMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.response?.data ||
            error?.message ||
            'Validation failed';

          setValidationState({
            status: 'error',
            message: String(errorMessage),
          });
        }
      }, 1000); // Increased to 1 second
    },
    [form, scenarioValue],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Don't show feedback if field was just cleared
  const shouldShowFeedback =
    validationState.status !== '' &&
    !justClearedRef.current &&
    currentValue &&
    currentValue.trim() !== '';

  return (
    <FormField
      name={name}
      help={help}
      initialValue={value}
      hasFeedback={shouldShowFeedback}
      validateStatus={shouldShowFeedback ? validationState.status : ''}
      rules={[
        {
          validator: async (_, value) => {
            // Blank/empty is OK if nullable
            if ((!value || !value.trim()) && nullable) {
              return Promise.resolve();
            }

            // Immediate validation: check for invalid characters
            const trimmedValue = value?.trim() || '';
            if (trimmedValue) {
              try {
                await validateNetworkNameChars(trimmedValue);
              } catch (error) {
                return Promise.reject(error);
              }
            }

            // If we have an error from backend validation, show it
            if (validationState.status === 'error' && validationState.message) {
              return Promise.reject(validationState.message);
            }

            return Promise.resolve();
          },
        },
      ]}
    >
      <Input
        placeholder={nullable ? 'Leave blank to auto-generate timestamp' : null}
        value={currentValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setCurrentValue(newValue);
          // Trigger debounced backend validation
          validateWithBackend(newValue);
        }}
        onBlur={(e) => {
          // Re-validate when field loses focus (catches newly created networks)
          validateWithBackend(e.target.value);
        }}
      />
    </FormField>
  );
};

const Parameter = ({ parameter, form, allParameters }) => {
  const { name, type, value, choices, nullable, help } = parameter;
  const { setFieldsValue } = form;

  // Debug logging to see parameter types
  if (name === 'network-name') {
    console.log('network-name parameter detected:', {
      name,
      type,
      value,
      nullable,
      allParameters,
    });
  }

  switch (type) {
    case 'IntegerParameter':
    case 'RealParameter': {
      const stringValue = value !== null ? value.toString() : '';
      const regex =
        type === 'IntegerParameter'
          ? /^-?([1-9][0-9]*|0)$/
          : /^-?([1-9][0-9]*|0)(\.\d+)?$/;
      return (
        <FormField
          name={name}
          help={help}
          rules={[
            {
              type: 'number',
              message: `Please enter an ${
                type === 'IntegerParameter' ? 'integer' : 'float'
              }`,
              transform: (num) => {
                if (num === '') return 0;
                return regex.test(num) ? Number(num) : NaN;
              },
            },
          ]}
          initialValue={stringValue}
        >
          <Input placeholder={nullable ? 'Leave blank for default' : null} />
        </FormField>
      );
    }
    case 'PathParameter':
    case 'FileParameter': {
      const contentType = type == 'PathParameter' ? 'directory' : 'file';
      const filters =
        type == 'PathParameter'
          ? []
          : [
              {
                name,
                extensions: parameter?.extensions || [],
              },
            ];

      return (
        <FormField
          name={name}
          help={help}
          rules={[
            {
              validator: async (_, value) => {
                if (value == '' && nullable) return Promise.resolve();

                try {
                  await checkExist(value, contentType);
                  return Promise.resolve();
                } catch (error) {
                  return Promise.reject(`${value} is not a valid path`);
                }
              },
            },
          ]}
          initialValue={value}
        >
          <OpenDialogInput form={form} type={contentType} filters={filters} />
        </FormField>
      );
    }
    case 'InputFileParameter': {
      const filters = [
        {
          name,
          extensions: parameter?.extensions || [],
        },
      ];

      const inputComponent = isElectron() ? (
        <OpenDialogInput form={form} type="file" filters={filters} />
      ) : (
        <UploadDialogInput form={form} type="file" filters={filters} />
      );

      return (
        <FormField
          name={name}
          help={help}
          rules={[
            {
              required: !nullable,
              message: 'Please select a file',
            },
            {
              validator: async (_, value) => {
                if (!value && nullable) return Promise.resolve();

                if (!value) {
                  return Promise.reject('Please select a file');
                }

                // Check file extension if extensions are specified
                if (parameter?.extensions?.length > 0) {
                  const fileName = value instanceof File ? value.name : value;
                  const fileExtension = fileName
                    .split('.')
                    .pop()
                    ?.toLowerCase();
                  const allowedExtensions = parameter.extensions.map((ext) =>
                    ext.toLowerCase(),
                  );

                  if (!allowedExtensions.includes(fileExtension)) {
                    return Promise.reject(
                      `File must have one of these extensions: ${parameter.extensions.join(', ')}`,
                    );
                  }
                }

                return Promise.resolve();
              },
            },
          ]}
          initialValue={value}
        >
          {inputComponent}
        </FormField>
      );
    }
    case 'ChoiceParameter':
    case 'PlantNodeParameter':
    case 'ScenarioNameParameter':
    case 'SingleBuildingParameter':
    case 'GenerationParameter':
    case 'SystemParameter':
    case 'ColumnChoiceParameter': {
      const options = choices.map((choice) => ({
        label: choice,
        value: choice,
      }));

      return (
        <FormField
          name={name}
          help={help}
          rules={[
            {
              validator: (_, value) => {
                if (choices.length < 1) {
                  if (type === 'GenerationParameter')
                    return Promise.reject(
                      'No generations found. Run optimization first.',
                    );
                  else
                    return Promise.reject(
                      'There are no valid choices for this input',
                    );
                } else if (value == null) {
                  return Promise.reject('Select a choice');
                } else if (!choices.includes(value)) {
                  return Promise.reject(`${value} is not a valid choice`);
                } else {
                  return Promise.resolve();
                }
              },
            },
          ]}
          initialValue={value}
        >
          <Select options={options} disabled={!choices.length} />
        </FormField>
      );
    }
    case 'MultiChoiceParameter':
    case 'BuildingsParameter':
    case 'MultiSystemParameter':
    case 'ColumnMultiChoiceParameter':
    case 'ScenarioNameMultiChoiceParameter': {
      const options = choices.map((choice) => ({
        label: choice,
        value: choice,
      }));

      const placeholder =
        type == 'BuildingsParameter' ? 'All Buildings' : 'Nothing Selected';
      const selectAll = (e) => {
        e.preventDefault();
        setFieldsValue({
          [name]: choices,
        });
      };

      const unselectAll = (e) => {
        e.preventDefault();
        setFieldsValue({
          [name]: [],
        });
      };

      return (
        <FormField
          name={name}
          help={help}
          rules={[
            {
              validator: (_, value) => {
                const invalidChoices = value.filter(
                  (choice) => !choices.includes(choice),
                );
                if (invalidChoices.length) {
                  return Promise.reject(
                    `${invalidChoices.join(', ')} ${
                      invalidChoices.length > 1
                        ? 'are not valid choices'
                        : 'is not a valid choice'
                    }`,
                  );
                } else {
                  return Promise.resolve();
                }
              },
            },
          ]}
          initialValue={value}
        >
          <Select
            options={options}
            mode="multiple"
            tokenSeparators={[',']}
            style={{ width: '100%' }}
            placeholder={placeholder}
            maxTagCount={10}
            popupRender={(menu) => (
              <div>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <Button onMouseDown={selectAll} style={{ width: '45%' }}>
                    Select All
                  </Button>
                  <Button onMouseDown={unselectAll} style={{ width: '45%' }}>
                    Unselect All
                  </Button>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                {menu}
              </div>
            )}
          />
        </FormField>
      );
    }
    case 'DatabasePathParameter': {
      const { choices } = parameter;
      const { Option } = Select;
      const Options = Object.keys(choices).map((choice) => (
        <Option key={choice} value={choices[choice]}>
          {choice}
        </Option>
      ));
      return (
        <FormField name={name} help={help} initialValue={value}>
          <Select
            popupRender={(menu) => (
              <div>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <OpenDialogButton
                  form={form}
                  type="directory"
                  id={name}
                  onChange={(value) => setFieldsValue({ [name]: value })}
                >
                  <PlusOutlined />
                  Browse for databases path
                </OpenDialogButton>
              </div>
            )}
          >
            {Options}
          </Select>
        </FormField>
      );
    }

    case 'WeatherPathParameter': {
      return (
        <FormField name={name} help={help} initialValue={value}>
          <SelectWithFileDialog
            placeholder="Choose an option from the dropdown"
            name="weather"
            type="file"
            filters={[{ name: 'Weather files', extensions: ['epw'] }]}
            options={[
              {
                label: 'Fetch from climate.onebuilding.org',
                value: 'climate.onebuilding.org',
              },
              {
                label: 'Generate a future weather file using pyepwmorph',
                value: 'pyepwmorph',
              },
            ]}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
              <FileSearchOutlined />
              Import .epw file
            </div>
          </SelectWithFileDialog>
        </FormField>
      );
    }
    case 'BooleanParameter':
      return (
        <FormField
          name={name}
          help={help}
          initialValue={value}
          valuePropName="checked"
        >
          <Switch />
        </FormField>
      );

    // Plot Context is not editable for now
    case 'PlotContextParameter': {
      return (
        <FormField
          name={name}
          help={help}
          initialValue={value}
          getValueProps={(value) => ({
            value: value
              ? Object.keys(value)
                  .map((key) => `${key}: ${value[key]}`)
                  .join(', ')
              : '',
          })}
        >
          <Input disabled />
        </FormField>
      );
    }

    case 'NetworkLayoutNameParameter': {
      return (
        <NetworkLayoutNameInput
          name={name}
          help={help}
          value={value}
          form={form}
          nullable={nullable}
          allParameters={allParameters}
        />
      );
    }

    default:
      return (
        <FormField name={name} help={help} initialValue={value}>
          <Input />
        </FormField>
      );
  }
};

const UploadInput = (props) => {
  const { children, onChange, ...rest } = props;

  const handlePreview = async (file) => {
    console.log(file);
  };

  // TODO: Add support for multiple files
  return (
    <Upload
      showUploadList={false}
      onPreview={handlePreview}
      beforeUpload={(file) => {
        onChange(file);
        return false; // Prevent automatic upload
      }}
      {...rest}
    >
      <Button block>{children}</Button>
    </Upload>
  );
};

const convertFiltersToExtensions = (filters) => {
  return filters
    .map((filter) =>
      filter.extensions && Array.isArray(filter.extensions)
        ? filter.extensions.map((ext) => `.${ext}`).join(',')
        : '',
    )
    .filter((str) => str !== '')
    .join(',');
};

export const OpenDialogInput = forwardRef(
  ({ form, name, type, onChange, filters = [], value, ...rest }, ref) => {
    const _value = value instanceof File ? value.name : value;

    if (!isElectron()) return <i>Not supported in browser</i>;

    return (
      <Space.Compact block style={{ paddingBottom: 3 }}>
        <Input
          ref={ref}
          style={{ width: '100%' }}
          value={_value}
          {...rest}
          readOnly
        />
        <Button
          type="primary"
          style={{ width: 60 }}
          icon={<FileSearchOutlined />}
          onClick={async () => {
            // TODO: Remove need for form
            const path = await openDialog(form, type, filters, name);
            onChange?.(path);
            form?.validateFields([name]);
          }}
        />
      </Space.Compact>
    );
  },
);
OpenDialogInput.displayName = 'OpenDialogInput';

export const UploadDialogInput = ({
  form,
  name,
  type,
  onChange,
  filters = [],
  children,
  value,
  ...rest
}) => {
  const _value = value instanceof File ? value.name : value;
  const extensions = convertFiltersToExtensions(filters);

  if (isElectron()) return <div>Upload not supported</div>;

  if (!value)
    return (
      <UploadInput
        form={form}
        name={name}
        onChange={onChange}
        type={type}
        accept={extensions}
        style={{ width: '100%' }}
        {...rest}
      >
        {children || (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadOutlined /> Upload File
          </div>
        )}
      </UploadInput>
    );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <FileImageOutlined />
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {_value}
      </div>
      <Button
        icon={<CloseOutlined />}
        aria-label="Clear file selection"
        onClick={() => onChange?.('')}
        danger
      />
    </div>
  );
};
UploadDialogInput.displayName = 'UploadDialogInput';

export const OpenDialogButton = ({
  form,
  name,
  type,
  filters = [],
  children,
  buttonType = 'default',
  onChange,
  ...rest
}) => {
  if (!isElectron()) {
    const extensions = convertFiltersToExtensions(filters);

    return (
      <UploadInput
        form={form}
        name={name}
        onChange={onChange}
        type={type}
        accept={extensions}
        {...rest}
      >
        {children}
      </UploadInput>
    );
  } else {
    return (
      <Button
        type={buttonType}
        style={{ width: '100%' }}
        onClick={async () => {
          // TODO: Remove need for form
          const path = await openDialog(form, type, filters, name);
          onChange?.(path);
          form?.validateFields([name]);
        }}
      >
        {children}
      </Button>
    );
  }
};

export default Parameter;
