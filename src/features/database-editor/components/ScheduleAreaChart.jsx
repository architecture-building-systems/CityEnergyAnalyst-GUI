import { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import dragDataPlugin from 'chartjs-plugin-dragdata';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  dragDataPlugin,
);

export const ScheduleAreaChart = ({
  data,
  onDataChange,
  title = 'Schedule',
}) => {
  const chartRef = useRef();
  const [chartData, setChartData] = useState(null);

  // Generate 24-hour labels (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    const dataset = {
      label: title,
      data: data,
      fill: true,
      backgroundColor: '#f7f7f7',
      borderColor: '#8eb6dc',
      pointBackgroundColor: '#8eb6dc',
      pointBorderColor: '#1470AF',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.1,
      dragData: true,
    };

    setChartData({
      labels: hours,
      datasets: [dataset],
    });
  }, [data, title]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: false,
      title: {
        display: true,
        text: title,
      },
      dragData: {
        round: 2,
        showTooltip: true,
        onDragStart: function (e) {
          // Optional: Add visual feedback when drag starts
        },
        onDrag: function (e, datasetIndex, index, value) {
          // Clamp value between 0 and 1
          const clampedValue = Math.max(0, Math.min(1, value));
          e.target.chart.data.datasets[datasetIndex].data[index] = clampedValue;
          return clampedValue;
        },
        onDragEnd: function (e, datasetIndex, index, value) {
          // Call the onChange callback when drag ends
          if (onDataChange && Array.isArray(data)) {
            const updatedData = [...data];
            updatedData[index] = Math.max(0, Math.min(1, value));
            onDataChange(updatedData);
          }
        },
      },
    },
    interaction: {
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Hour of Day',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Schedule Value',
        },
        min: 0,
        max: 1,
        ticks: {
          stepSize: 0.1,
        },
      },
    },
  };

  if (!chartData) {
    return <div>Loading chart...</div>;
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};
