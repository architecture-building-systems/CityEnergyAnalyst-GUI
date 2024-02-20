import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import ceaLogo from '../../assets/cea-logo.png';

const useLoadingMessages = () => {
  const [message, setMessage] = useState('');
  useEffect(() => {
    setMessage('Starting CEA Dashboard...');
  }, []);
  return message;
};

const Splash = () => {
  const message = useLoadingMessages();
  const springs = useSpring({
    from: { scale: 1 },
    to: [{ scale: 1.1 }, { scale: 1 }],
    loop: true,
    config: {
      duration: 800,
    },
  });

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#2e2c29',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <animated.div
        style={{
          width: 100,
          ...springs,
        }}
      >
        <img
          src={ceaLogo}
          style={{ width: '100%' }}
          alt="CEA Logo"
          draggable="false"
        />
      </animated.div>
      <h1 style={{ margin: 20, color: 'white', textAlign: 'center' }}>
        City Energy Analyst
      </h1>
      <small>{message}</small>
    </div>
  );
};

export default Splash;
