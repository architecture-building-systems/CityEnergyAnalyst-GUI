import { useProjectStore } from './projectStore';

const STATE = { pathway_name: 'S1', year: 2040 };

beforeEach(() => {
  useProjectStore.setState({
    project: '/p',
    scenario: 'baseline',
    childScenario: STATE,
  });
});

describe('inspected pathway state', () => {
  it('survives re-setting the same project and scenario (a page remount)', () => {
    useProjectStore.getState().setProject('/p');
    useProjectStore.getState().updateScenario('baseline');
    expect(useProjectStore.getState().childScenario).toEqual(STATE);
  });

  it('is left when the scenario changes', () => {
    useProjectStore.getState().updateScenario('other');
    expect(useProjectStore.getState().childScenario).toBeNull();
  });

  it('is left when the project changes', () => {
    useProjectStore.getState().setProject('/other');
    expect(useProjectStore.getState().childScenario).toBeNull();
  });
});
