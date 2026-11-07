import { useState } from 'react';
import { Button, message } from 'antd';
import { useProjectStore } from 'features/project/stores/projectStore';
import { openReport } from 'features/report-builder/utils/openReport';

// Whether a job's script writes a report, given the `/reports/builders` list
export const isReportJob = (reportBuilders, job) =>
  !!reportBuilders?.some((builder) => builder.name === job?.script);

// Opens the report a finished report-tool job wrote. Hook-free apart from local state, so it also
// works inside antd's static `notification` (rendered outside the app's providers).
const OpenReportButton = ({ job, onOpen, ...buttonProps }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    onOpen?.();
    setLoading(true);
    try {
      // Job records carry the scenario name, not the project path - reports
      // are opened for the scenario the job ran on, in the active project.
      await openReport(job.script, {
        project: useProjectStore.getState().project,
        scenarioName: job.scenario_name,
        childScenario: null,
      });
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      size="small"
      loading={loading}
      onClick={handleClick}
      {...buttonProps}
    >
      Open Report
    </Button>
  );
};

export default OpenReportButton;
