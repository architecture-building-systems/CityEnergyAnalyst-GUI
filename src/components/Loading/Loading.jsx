import CeaLogoAnimate from '../../assets/cea-logo-animate.svg';

const CeaBadge = () => (
  <div
    style={{
      display: 'flex',
      width: 'fit-content',
      background: 'rgb(69,77,84)',
      borderRadius: 8,
      padding: '3px 8px',
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    }}
  >
    CEA 4
  </div>
);

const Loading = ({ children }) => {
  const ceaText = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      fontSize={30}
      fill="currentColor"
    >
      <text x="0" y="30">
        City
      </text>
      <text x="0" y="70">
        Energy
      </text>
      <text x="0" y="110">
        Analyst
      </text>
    </svg>
  );

  return (
    <div
      className="cea-loading"
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        flexDirection: 'column',

        gap: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',

          gap: 32,
        }}
      >
        <div style={{ width: '10%', minWidth: 100 }}>
          <CeaLogoAnimate />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '10%',
            minWidth: 100,

            fontFamily: 'Arial',
            color: 'rgb(69,77,84)',
          }}
        >
          <div style={{ width: '50%' }}>{ceaText}</div>
          <div style={{ width: '60%' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 92 33"
              fontSize={24}
            >
              <g>
                <rect
                  x="0"
                  y="0"
                  width="92"
                  height="33"
                  rx="8"
                  fill="rgb(69,77,84)"
                />
                <text x="8" y="25" fill="white" fontWeight="bold">
                  CEA-<tspan dx="3">4</tspan>
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
};

export default Loading;
