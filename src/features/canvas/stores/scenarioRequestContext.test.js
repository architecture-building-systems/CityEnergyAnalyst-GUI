import { childStateScenarioPath, scenarioRequestContext } from './canvasStore';

const statePath = childStateScenarioPath('baseline', 'S1', 2040);
const columns = [
  { type: 'pathway-state', pathwayName: 'S1', year: 2040, scenario: statePath },
  { type: 'scenario', scenario: 'other' },
];

describe('scenarioRequestContext', () => {
  it('sends a pathway-state column as its parent scenario plus the state', () => {
    expect(scenarioRequestContext(columns, 'baseline', statePath)).toEqual({
      scenario: 'baseline',
      childScenario: { pathway_name: 'S1', year: 2040 },
    });
  });

  it('sends a bare scenario name as it is', () => {
    expect(scenarioRequestContext(columns, 'baseline', 'other')).toEqual({
      scenario: 'other',
      childScenario: null,
    });
  });

  it('passes no scenario through (a disabled fetch)', () => {
    expect(scenarioRequestContext(columns, 'baseline', null)).toEqual({
      scenario: null,
      childScenario: null,
    });
  });
});
