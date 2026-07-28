import { Dropdown } from 'antd';
import { SCHEDULE_STATES, STATE_COLORS } from './scheduleStates';

const ScheduleBlockCell = ({ hour, state, onSelect }) => (
  <Dropdown
    trigger={['click']}
    menu={{
      selectedKeys: [state],
      items: SCHEDULE_STATES.map((option) => ({
        key: option,
        label: option,
      })),
      onClick: ({ key }) => onSelect(hour, key),
    }}
  >
    <div
      title={`${hour}:00 — ${state}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 20,
          height: 40,
          backgroundColor: STATE_COLORS[state] ?? STATE_COLORS.OFF,
          border: '1px solid #d9d9d9',
          borderRadius: 2,
        }}
      />
      <div style={{ fontSize: 10, color: '#8c8c8c' }}>{hour}</div>
    </div>
  </Dropdown>
);

const ScheduleStateLegend = () => (
  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
    {SCHEDULE_STATES.map((state) => (
      <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 12,
            height: 12,
            backgroundColor: STATE_COLORS[state],
            border: '1px solid #d9d9d9',
            borderRadius: 2,
          }}
        />
        <span style={{ fontSize: 12, color: '#595959' }}>{state}</span>
      </div>
    ))}
  </div>
);

// Compact colored-block view for categorical (OFF / SETBACK / SETPOINT)
// schedules, e.g. heating/cooling. Click a cell to choose its state.
export const ScheduleBlockStrip = ({
  data,
  onDataChange,
  title = 'Schedule',
}) => {
  if (!data || !Array.isArray(data)) return null;

  const handleSelect = (index, state) => {
    if (!onDataChange) return;
    if (data[index] === state) return;
    const updatedData = [...data];
    updatedData[index] = state;
    onDataChange(updatedData);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
        {data.map((state, hour) => (
          <ScheduleBlockCell
            key={hour}
            hour={hour}
            state={state}
            onSelect={handleSelect}
          />
        ))}
      </div>
      <ScheduleStateLegend />
    </div>
  );
};
