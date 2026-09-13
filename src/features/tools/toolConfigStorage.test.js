import { describe, it, expect } from 'vitest';
import { overlayStoredValues } from './toolConfigStorage';

describe('overlayStoredValues', () => {
  it('applies a stored value for a plain (non-choice) parameter', () => {
    const data = {
      parameters: [{ name: 'year', type: 'IntegerParameter', value: 2020 }],
    };
    const result = overlayStoredValues(data, { year: 2050 });
    expect(result.parameters[0].value).toBe(2050);
  });

  it('applies a stored single-choice value that is still valid', () => {
    const data = {
      parameters: [
        {
          name: 'climate-pathway',
          type: 'ChoiceParameter',
          value: 'Moderate',
          choices: ['Best Case', 'Moderate', 'Worst Case'],
        },
      ],
    };
    const result = overlayStoredValues(data, {
      'climate-pathway': 'Worst Case',
    });
    expect(result.parameters[0].value).toBe('Worst Case');
  });

  it('drops a stored single-choice value no longer in the current choices, keeping the server value', () => {
    const data = {
      parameters: [
        {
          name: 'climate-pathway',
          type: 'ChoiceParameter',
          value: 'Moderate',
          choices: ['Best Case', 'Moderate'],
        },
      ],
    };
    // "Worst Case" was a valid selection under a different scenario/config; the current
    // scenario's choices no longer include it.
    const result = overlayStoredValues(data, {
      'climate-pathway': 'Worst Case',
    });
    expect(result.parameters[0].value).toBe('Moderate');
  });

  it('filters a stored multi-choice selection down to what is still valid, matching the backend', () => {
    const data = {
      parameters: [
        {
          name: 'what-if-name',
          type: 'WhatIfNameMultiChoiceParameter',
          value: [],
          choices: ['scenario-b-run'],
        },
      ],
    };
    // Selected while a different scenario (with "scenario-a-run") was active.
    const result = overlayStoredValues(data, {
      'what-if-name': ['scenario-a-run', 'scenario-b-run'],
    });
    expect(result.parameters[0].value).toEqual(['scenario-b-run']);
  });

  it('drops an entirely stale multi-choice selection to an empty array, not the server value', () => {
    const data = {
      parameters: [
        {
          name: 'what-if-name',
          type: 'WhatIfNameMultiChoiceParameter',
          value: [],
          choices: ['scenario-b-run'],
        },
      ],
    };
    const result = overlayStoredValues(data, {
      'what-if-name': ['scenario-a-run'],
    });
    expect(result.parameters[0].value).toEqual([]);
  });

  it('leaves dict-shaped choices (WeatherPathParameter) overlaid as-is, unvalidated', () => {
    const data = {
      parameters: [
        {
          name: 'weather',
          type: 'WeatherPathParameter',
          value: 'climate.onebuilding.org',
          choices: { Zurich: '/path/to/zurich.epw' },
        },
      ],
    };
    const result = overlayStoredValues(data, { weather: 'some-stored-path' });
    expect(result.parameters[0].value).toBe('some-stored-path');
  });

  it('applies overrides inside categorical_parameters the same way', () => {
    const data = {
      parameters: [],
      categorical_parameters: {
        'Parameters for pyepwmorph': [
          {
            name: 'percentile',
            type: 'ChoiceParameter',
            value: 50,
            choices: [1, 5, 10, 25, 50, 75, 90, 95, 99],
          },
        ],
      },
    };
    const result = overlayStoredValues(data, { percentile: 90 });
    expect(
      result.categorical_parameters['Parameters for pyepwmorph'][0].value,
    ).toBe(90);
  });

  it('returns data unchanged when storedMap is empty or absent', () => {
    const data = { parameters: [{ name: 'year', value: 2020 }] };
    expect(overlayStoredValues(data, {})).toBe(data);
    expect(overlayStoredValues(data, null)).toBe(data);
  });
});
