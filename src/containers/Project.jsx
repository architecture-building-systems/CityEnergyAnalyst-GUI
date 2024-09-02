import OverviewCard from '../components/Project/Cards/OverviewCard/OverviewCard';

const Project = () => {
  return (
    <div style={{ height: '100%', background: '#f0f2f8' }}>
      <div
        style={{
          position: 'absolute',
          padding: 12,
        }}
      >
        <OverviewCard />
      </div>
    </div>
  );
};

export default Project;
