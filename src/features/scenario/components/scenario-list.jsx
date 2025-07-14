import { List } from 'antd';
import { useEffect, useMemo } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

export const ScenarioList = () => {
  const project = useProjectStore((state) => state.project);
  const scenariosList = useProjectStore((state) => state.scenariosList);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);

  const { isFetching, error } = useProjectStore();

  const scenarioNames = useMemo(
    () => scenariosList?.sort() ?? [],
    [scenariosList],
  );

  // Ensure scenariosList is udpated
  useEffect(() => {
    project && fetchInfo(project);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',

        padding: 24,
      }}
    >
      <div>
        <h2>Scenarios in current Project</h2>
        <p>{scenarioNames.length} Scenario found</p>
      </div>
      <div style={{ overflow: 'auto' }}>
        {error ? (
          <div>Error fetching scenarios</div>
        ) : isFetching ? (
          <div>Fetching scenarios...</div>
        ) : (
          <List
            dataSource={scenarioNames}
            renderItem={(item) => (
              <List.Item
                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
              >
                {item}
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};
