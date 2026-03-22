import { Card, Typography, Button, Tag } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import KpiCard from './KpiCard';
import ReportPlot from './ReportPlot';
import { useFetchSummary } from '../hooks/useReportsData';

const { Text } = Typography;

/**
 * A single comparison column showing KPIs + chart for one what-if (or scenario).
 */
const WhatIfColumn = ({ project, scenario, feature, whatif, onRemove }) => {
  const { data: summary, isLoading: summaryLoading } = useFetchSummary(
    project,
    scenario,
    feature,
    whatif,
  );

  const kpis = summary?.kpis || [];

  return (
    <Card
      size="small"
      style={columnStyle}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color="blue">{whatif || 'default'}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {scenario}
          </Text>
        </div>
      }
      extra={
        onRemove ? (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onRemove}
          />
        ) : null
      }
    >
      {/* KPI cards */}
      <div style={kpiGridStyle}>
        {summaryLoading
          ? Array.from({ length: 3 }).map((_, i) => <KpiCard key={i} loading />)
          : kpis
              .slice(0, 6)
              .map((kpi) => (
                <KpiCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.value}
                  unit={kpi.unit}
                />
              ))}
      </div>

      {/* Plot */}
      <div style={{ marginTop: 16 }}>
        <ReportPlot
          project={project}
          scenario={scenario}
          feature={feature}
          whatif={whatif}
        />
      </div>
    </Card>
  );
};

const columnStyle = {
  flex: '1 1 0',
  minWidth: 350,
  maxWidth: 600,
  overflow: 'hidden',
};

const kpiGridStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

export default WhatIfColumn;
