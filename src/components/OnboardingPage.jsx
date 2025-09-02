import { useState } from 'react';
import {
  Button,
  Select,
  Checkbox,
  Typography,
  Card,
  message,
  Input,
} from 'antd';
import CeaLogoSVG from 'assets/cea-logo.svg';
import { authClient } from 'lib/api/axios';
import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import { useInitUserInfo } from 'stores/userStore';
import './OnboardingPage.css';

const { Title, Text } = Typography;
const { Option } = Select;

const OnboardingPage = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    primaryReason: null,
    role: null,
    currentTools: [],
    hearAbout: null,
    code: null,
  });
  const [loading, setLoading] = useState(false);
  const { push } = useNavigationStore();
  const initUserInfo = useInitUserInfo();

  const primaryReasons = [
    'Energy system analysis',
    'Urban planning research',
    'Building performance optimization',
    'Sustainability assessment',
    'Academic research',
    'Policy development',
  ];

  const roles = [
    'Researcher',
    'Engineer',
    'Urban Planner',
    'Architect',
    'Policy Maker',
    'Student',
    'Consultant',
    'Other',
  ];

  const tools = [
    'EnergyPLAN',
    'HOMER',
    'RETScreen',
    'IDA ICE',
    'DesignBuilder',
    'EnergyPlus',
    'OpenStudio',
    'TRNSYS',
    'Modelica/Dymola',
    'Excel/Spreadsheets',
    'Python/R',
    "I don't use energy analysis tools",
    'Other',
  ];

  const hearAboutOptions = [
    'Academic publication',
    'Conference presentation',
    'Colleague recommendation',
    'Online search',
    'Social media',
    'GitHub',
    'University course',
    'Workshop/Training',
  ];

  const handleSelectChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToolsChange = (checkedValues) => {
    setFormData((prev) => ({ ...prev, currentTools: checkedValues }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await authClient.post('/api/user/onboarding', {
        primaryReason: formData.primaryReason,
        role: formData.role,
        currentTools: formData.currentTools,
        hearAbout: formData.hearAbout,
        code: formData.code,
      });

      message.success('Welcome to City Energy Analyst!');

      // Refresh user info to get updated onboarded status
      await initUserInfo();

      // Navigate to main application
      push(routes.PROJECT);

      // Call optional completion callback
      onComplete?.(formData);
    } catch (error) {
      console.error('Onboarding submission failed:', error);
      message.error('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.primaryReason && formData.role;

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <Card className="onboarding-form-card">
          <div className="onboarding-header">
            <Title level={3} className="onboarding-title">
              Help us better understand your
              <br />
              research needs and use-cases
            </Title>
          </div>

          <div className="onboarding-form">
            <div className="form-field">
              <Text className="form-label">
                What is your primary reason for using City Energy Analyst?
              </Text>
              <Select
                placeholder="Select your primary use case"
                className="form-select"
                value={formData.primaryReason}
                onChange={handleSelectChange('primaryReason')}
              >
                {primaryReasons.map((reason) => (
                  <Option key={reason} value={reason}>
                    {reason}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="form-field">
              <Text className="form-label">
                What is your role within your organization?
              </Text>
              <Select
                placeholder="Select your role"
                className="form-select"
                value={formData.role}
                onChange={handleSelectChange('role')}
              >
                {roles.map((role) => (
                  <Option key={role} value={role}>
                    {role}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="form-field">
              <Text className="form-label">
                Which energy analysis tools are you currently using?
              </Text>
              <Text className="form-sublabel">Select all that apply</Text>
              <div className="checkbox-grid">
                <Checkbox.Group
                  value={formData.currentTools}
                  onChange={handleToolsChange}
                >
                  {tools.map((tool) => (
                    <Checkbox key={tool} value={tool} className="tool-checkbox">
                      {tool}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </div>
            </div>

            <div className="form-field">
              <Text className="form-label">
                How did you hear about City Energy Analyst? (optional)
              </Text>
              <Select
                placeholder="Select one"
                className="form-select"
                value={formData.hearAbout}
                onChange={handleSelectChange('hearAbout')}
                allowClear
              >
                {hearAboutOptions.map((option) => (
                  <Option key={option} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="form-field">
              <Text className="form-label">Code (optional)</Text>
              <Input
                placeholder="Enter code if you have one"
                className="form-input"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>

            <Button
              type="primary"
              size="large"
              className="onboarding-submit-btn"
              onClick={handleSubmit}
              disabled={!isFormValid}
              loading={loading}
              block
            >
              {loading ? 'Setting up your account...' : 'Next: Get Started'}
            </Button>

            <Text className="privacy-text">
              We use survey responses to provide you with relevant content and
              improve our tools and services. See our{' '}
              <a
                href="https://cityenergyanalyst.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>{' '}
              for more information.
            </Text>
          </div>
        </Card>

        <div className="onboarding-visual">
          <div className="cea-logo-container">
            <CeaLogoSVG className="cea-logo-svg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
