import useDemoStore from './demoStore';

// demoStore has no imports outside zustand, so tests interact with the
// store directly rather than mocking anything.

const initialState = useDemoStore.getInitialState();

beforeEach(() => {
  useDemoStore.setState(initialState, true);
});

describe('enterDemo', () => {
  it('enters demo mode, defaults demoId to the first scenario, and stores routePrefixes', () => {
    const scenarios = [
      { id: 'baseline', name: 'baseline' },
      { id: 'alt', name: 'alt' },
    ];
    const routePrefixes = ['/inputs/', '/canvas/'];

    useDemoStore.getState().enterDemo(scenarios, routePrefixes);

    const state = useDemoStore.getState();
    expect(state.demoMode).toBe(true);
    expect(state.demoScenarios).toBe(scenarios);
    expect(state.demoId).toBe('baseline');
    expect(state.routePrefixes).toBe(routePrefixes);
  });

  it('leaves demoId null when the scenario list is empty (the UserCheckGate error-fallback path)', () => {
    useDemoStore.getState().enterDemo([]);

    const state = useDemoStore.getState();
    expect(state.demoMode).toBe(true);
    expect(state.demoId).toBeNull();
    expect(state.demoScenarios).toEqual([]);
  });

  it('defaults routePrefixes to [] when the caller omits it', () => {
    useDemoStore.getState().enterDemo([{ id: 'baseline' }]);

    expect(useDemoStore.getState().routePrefixes).toEqual([]);
  });
});

describe('setDemoId', () => {
  it('updates demoId without touching other fields', () => {
    useDemoStore
      .getState()
      .enterDemo([{ id: 'baseline' }, { id: 'alt' }], ['/inputs/']);

    useDemoStore.getState().setDemoId('alt');

    const state = useDemoStore.getState();
    expect(state.demoId).toBe('alt');
    expect(state.demoMode).toBe(true);
    expect(state.routePrefixes).toEqual(['/inputs/']);
  });
});

describe('exitDemo', () => {
  it('clears every field, including routePrefixes, back to its initial value', () => {
    useDemoStore
      .getState()
      .enterDemo([{ id: 'baseline' }], ['/inputs/', '/canvas/']);

    useDemoStore.getState().exitDemo();

    expect(useDemoStore.getState()).toMatchObject({
      demoMode: false,
      demoId: null,
      demoScenarios: [],
      routePrefixes: [],
    });
  });
});
