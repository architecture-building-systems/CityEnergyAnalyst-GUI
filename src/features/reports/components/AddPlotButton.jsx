import CircleActionButton from './CircleActionButton';

const AddPlotButton = ({ label = 'Add a plot', onClick }) => (
  <CircleActionButton label={label} onClick={onClick} size="sm" />
);

export default AddPlotButton;
