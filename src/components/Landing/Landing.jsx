import ceaLogo from '../../assets/cea-logo-name.png';
import NewProjectModalButton from './Buttons/NewProjectModalButton';
import OpenProjectModalButton from './Buttons/OpenProjectModalButton';

const Landing = () => {
  return (
    <div
      style={{
        height: '100%',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          border: '1px solid #ccc',
          borderRadius: 8,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

          height: '100%',
        }}
      >
        <img src={ceaLogo} style={{ width: 350 }} alt="CEA Logo" />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            width: 350,
          }}
        >
          <NewProjectModalButton />
          <OpenProjectModalButton />
        </div>
      </div>
    </div>
  );
};

export default Landing;
