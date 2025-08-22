import { Button } from 'antd';
import { TableDataset } from './table-dataset';
import { ScheduleAreaChart } from 'features/database-editor/components/ScheduleAreaChart';
import { useEffect, useState } from 'react';
import { MissingDataPrompt } from './missing-data-prompt';

export const UseTypeDataset = ({ dataset }) => {
  // Consist of two keys: use_types and schedules.
  // use_types is an object with keys as use_types and values as properties.
  // schedules is an object with keys as use_types and values as schedules.

  const [selectedUseType, setSelectedUseType] = useState(null);

  // Ensure data is valid
  const useTypeData = dataset?.use_types;
  const scheduleData = dataset?.schedules;

  // Try to get all use types from use_types or schedules
  const useTypes = Array.from(
    new Set([
      ...Object.keys(useTypeData || {}),
      ...Object.keys(scheduleData?.monthly_multipliers || {}),
      ...Object.keys(scheduleData?._library || {}),
    ]),
  );

  // Select first use type if none selected or selected use type is not in use types
  const activeUseType = selectedUseType ?? useTypes?.[0];

  const selectedUseTypeData = useTypeData?.[activeUseType];
  const selectedMultiplierData =
    scheduleData?.monthly_multipliers?.[activeUseType];
  const selectedLibraryData = scheduleData?._library?.[activeUseType];

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
        selected={activeUseType}
        onSelected={setSelectedUseType}
      />
      {activeUseType !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div>Properties</div>
          <TableDataset
            data={selectedUseTypeData ? [selectedUseTypeData] : null}
          />

          <div>Schedules</div>
          <TableDataset
            name={'Monthly Multipliers'}
            data={selectedMultiplierData ? [selectedMultiplierData] : null}
          />
          <UseTypeSchedules data={selectedLibraryData} />
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

const ScheduleButtons = ({ schedules, selected, onSelected }) => {
  useEffect(() => {
    // Select first schedule if none selected or selected schedule is not in schedules
    if (
      schedules?.length &&
      (selected == null || !schedules.includes(selected))
    )
      onSelected?.(schedules[0]);
  }, [schedules, selected, onSelected]);

  return (
    <div
      className="cea-database-editor-database-dataset-buttons"
      style={{ flexDirection: 'row', overflowX: 'auto', paddingBottom: 12 }}
    >
      {schedules.map((schedule) => (
        <Button
          key={schedule}
          onClick={() => onSelected?.(schedule)}
          type={schedule === selected ? 'primary' : 'default'}
        >
          {schedule.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

const UseTypeSchedules = ({ data }) => {
  // Data is array of schedule objects
  // schedules format {"hour":"Weekday_12","occupancy":0.5,"appliances":0.85, ... }
  // hour can be "Weekday_1","Saturday_2", "Sunday_3"

  const [selectedSchedule, setSelectedSchedule] = useState(null);

  if (data == null) return <MissingDataPrompt />;

  const schedules = Object.keys(data?.[0] ?? {}).filter((key) => key != 'hour');
  const selectedScheduleData = extractSchedule(data, selectedSchedule);

  return (
    <div
      className="cea-database-editor-database-use-type-schedules"
      style={{
        display: 'flex',
        flexDirection: 'column',

        gap: 12,
      }}
    >
      <ScheduleButtons
        schedules={schedules}
        selected={selectedSchedule}
        onSelected={setSelectedSchedule}
      />

      {selectedScheduleData != null &&
      ['heating', 'cooling'].includes(selectedSchedule) ? (
        <div>TODO</div>
      ) : (
        <div>
          {Object.keys(selectedScheduleData).map((schedule) => {
            return (
              <ScheduleAreaChart
                key={schedule}
                data={selectedScheduleData[schedule]}
                title={schedule}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
