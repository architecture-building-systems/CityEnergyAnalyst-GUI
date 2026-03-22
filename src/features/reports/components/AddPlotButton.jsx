import { PlusOutlined } from '@ant-design/icons';

/**
 * Blue circle + text button for adding plots or columns.
 * Matches mockup: blue filled circle icon with label to the right.
 */
const AddPlotButton = ({ label = 'Add a plot', onClick }) => {
  return (
    <button type="button" onClick={onClick} style={buttonStyle}>
      <span style={circleStyle}>
        <PlusOutlined style={{ color: '#fff', fontSize: 16 }} />
      </span>
      <span style={labelStyle}>{label}</span>
    </button>
  );
};

const buttonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 4px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
};

const circleStyle = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#1470AF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const labelStyle = {
  fontSize: 14,
  color: '#333',
  fontWeight: 500,
};

export default AddPlotButton;
