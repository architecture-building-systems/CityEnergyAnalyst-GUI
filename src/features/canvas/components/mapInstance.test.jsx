import { renderHook } from '@testing-library/react';

import { useProjectStore } from 'features/project/stores/projectStore';

import {
  MapLayerScenarioOverrideContext,
  useScopedProjectScenario,
} from './mapInstance';

const INSPECTED = { pathway_name: 'S1', year: 2026 };
const COLUMN_STATE = { pathway_name: 'S1', year: 2040 };

const render = (override) =>
  renderHook(() => useScopedProjectScenario(), {
    wrapper: ({ children }) => (
      <MapLayerScenarioOverrideContext.Provider value={override}>
        {children}
      </MapLayerScenarioOverrideContext.Provider>
    ),
  }).result.current;

beforeEach(() => {
  useProjectStore.setState({
    project: '/p',
    scenario: 'baseline',
    childScenario: INSPECTED,
  });
});

describe('useScopedProjectScenario', () => {
  it("uses a column override's own state, not the main view's", () => {
    expect(
      render({
        project: '/p',
        scenarioName: 'baseline',
        childScenario: COLUMN_STATE,
      }),
    ).toEqual({
      project: '/p',
      scenarioName: 'baseline',
      childScenario: COLUMN_STATE,
    });
  });

  it('sends no state for an override without one', () => {
    expect(
      render({ project: '/p', scenarioName: 'other' }).childScenario,
    ).toBeNull();
  });

  it("falls back to the main view's inspected state without an override", () => {
    expect(render(null).childScenario).toEqual(INSPECTED);
  });
});
