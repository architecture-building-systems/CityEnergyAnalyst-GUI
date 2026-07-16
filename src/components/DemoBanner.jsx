import useDemoStore from 'stores/demoStore';

// Read-only notice shown on the project page while viewing public demo
// scenarios (no valid session - see stores/demoStore.js and
// app/UserCheckGate.jsx). Sits alongside `UserInfo`'s login button, which
// is already rendered unconditionally when logged out.
const DemoBanner = () => {
  const demoScenarios = useDemoStore((state) => state.demoScenarios);

  if (!demoScenarios.length) return <DemoEmptyNotice />;

  return (
    <div
      style={{
        padding: 8,
        background: '#fff',
        borderRadius: 9,
        boxShadow: '0 0 10px rgba(0,0,0,.1)',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 'bold' }}>Viewing a demo scenario</div>
      <div style={{ color: 'rgba(0,0,0,0.65)' }}>
        Log in to work with your own projects.
      </div>
    </div>
  );
};

// Shown instead of the notice above when the backend has no
// `public_demo_scenarios` configured (or the list failed to load) - there's
// nothing to view, but we still want it clear this isn't a real project.
const DemoEmptyNotice = () => (
  <div
    style={{
      padding: 8,
      background: '#fff',
      borderRadius: 9,
      boxShadow: '0 0 10px rgba(0,0,0,.1)',
      fontSize: 12,
      color: 'rgba(0,0,0,0.65)',
    }}
  >
    No demo scenarios are available. Log in to open your own projects.
  </div>
);

export default DemoBanner;
