import { Button } from 'antd';
import { TableDataset } from './table-dataset';
import { useState } from 'react';

export const UseTypeDataset = ({ dataset }) => {
  // Consist of two keys: use_types and schedules.
  // use_types is an object with keys as use_types and values as properties.
  // schedules is an object with keys as use_types and values as schedules.

  const [selectedUseType, setSelectedUseType] = useState(null);

  // Ensure data is valid
  const useTypeData = dataset?.use_types;
  const scheduleData = dataset?.schedules;
  if (useTypeData == null || scheduleData == null)
    return <div>No data found</div>;

  const useTypes = Object.keys(useTypeData);
  const selectedUseTypeData = useTypeData?.[selectedUseType];

  return (
    <div
      className="cea-database-editor-database-use-type"
      style={{
        display: 'flex',
        gap: 12,

        flex: 1,
        minWidth: 0, // Prevents flex from growing
      }}
    >
      <UseTypeButtons
        types={useTypes}
        selected={selectedUseType}
        onSelected={setSelectedUseType}
      />
      {selectedUseType !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div>Properties</div>
          <TableDataset data={[selectedUseTypeData]} />

          <div>Schedules</div>
          <TableDataset
            name={'Monthly Multipliers'}
            data={[scheduleData?.monthly_multipliers?.[selectedUseType]]}
          />
          <UseTypeSchedules data={scheduleData?._library?.[selectedUseType]} />
        </div>
      )}
    </div>
  );
};

const UseTypeButtons = ({ types, selected, onSelected }) => {
  return (
    <div className="cea-database-editor-database-dataset-buttons">
      {types.map((useType) => (
        <Button
          key={useType}
          onClick={() => onSelected?.(useType)}
          type={useType === selected ? 'primary' : 'default'}
        >
          {useType.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

const extractSchedule = (data, schedule) => {
  if (data == null) return [];

  const weekdayRows = data.filter((schedule) =>
    schedule.hour.includes('Weekday_'),
  );
  const weekday = weekdayRows.map((row) => row[schedule]);

  const saturdayRows = data.filter((schedule) =>
    schedule.hour.includes('Saturday_'),
  );
  const saturday = saturdayRows.map((row) => row[schedule]);

  const sundayRows = data.filter((schedule) =>
    schedule.hour.includes('Sunday_'),
  );
  const sunday = sundayRows.map((row) => row[schedule]);

  return { weekday, saturday, sunday };
};

const UseTypeSchedules = ({ data }) => {
  // Data is array of schedule objects
  // schedules format {"hour":"Weekday_12","occupancy":0.5,"appliances":0.85, ... }
  // hour can be "Weekday_1","Saturday_2", "Sunday_3"
  if (data == null) return <div>No data found</div>;

  const schedules = Object.keys(data?.[0] ?? {});

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 0,
      }}
    >
      {schedules.map((schedule) => {
        if (schedule == 'hour') return null;
        const scheduleData = extractSchedule(data, schedule);
        return (
          <div key={schedule}>
            <small style={{ flex: 12 }}>
              <b>{schedule}</b>
            </small>

            <ScheduleGraph data={scheduleData} />
          </div>
        );
      })}
    </div>
  );
};

const ScheduleGraph = ({ data }) => {
  console.log(data);
  return (
    <div>
      <div>Schedule Graph</div>
      <div>{JSON.stringify(data)}</div>
    </div>
  );
};
