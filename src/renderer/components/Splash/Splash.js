import React, { useEffect, useState } from 'react';
import { useSpring, animated } from 'react-spring';
import getStatic from '../../utils/static';

const logo = getStatic('cea-logo.png');

const useLoadingMessages = () => {
  const [message, setMessage] = useState('');
  useEffect(() => {
    setMessage('Starting CEA Dashboard...');
  }, []);
  return message;
};

const usePulse = () => {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    setInterval(() => setPulse(oldValue => !oldValue), 800);
  }, []);
  return pulse;
};

const Splash = () => {
  const message = useLoadingMessages();
  const pulse = usePulse();
  const props = useSpring({ scale: pulse ? 1 : 1.1 });

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#2e2c29',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      <animated.div
        style={{
          width: 100,
          transform: props.scale.interpolate(x => `scale(${x})`)
        }}
      >
        <img
          src={logo}
          style={{ width: '100%' }}
          alt="CEA Logo"
          draggable="false"
        />
      </animated.div>
      <h1 style={{ margin: 20, color: 'white' }}>City Enegry Analyst</h1>
      <small>{message}</small>
    </div>
  );
};

export default Splash;
