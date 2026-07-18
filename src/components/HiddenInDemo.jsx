import { useDemoMode } from 'stores/demoStore';

// Hides its children while viewing a public demo scenario (see
// stores/demoStore.js). Use this instead of repeating `!demoMode && (...)`
// around write-only UI (buttons, editors, uploads) that the demo API
// doesn't support.
export const HiddenInDemo = ({ children }) => {
  const demoMode = useDemoMode();
  if (demoMode) return null;
  return children;
};

// Same gate, but baked into a component's own definition rather than left
// to whoever renders it. Use this on write-only components (add/delete/
// upload buttons) so a new call site can't forget the demo check -
// `<AddRowButton />` is safe to render anywhere, unconditionally.
export const withHiddenInDemo = (Component) => {
  const Wrapped = (props) => {
    const demoMode = useDemoMode();
    if (demoMode) return null;
    return <Component {...props} />;
  };
  Wrapped.displayName = `withHiddenInDemo(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

export default HiddenInDemo;
