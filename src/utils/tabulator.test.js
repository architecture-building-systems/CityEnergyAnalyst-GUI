import { describe, it, expect } from 'vitest';
import { getBoundError, getColumnPropsFromDataType } from './tabulator';

describe('getBoundError', () => {
  it('accepts values within min and max, edges included', () => {
    const column = { type: 'float', min: 0, max: 1 };
    expect(getBoundError(column, 0)).toBeNull();
    expect(getBoundError(column, '0.5')).toBeNull();
    expect(getBoundError(column, 1)).toBeNull();
  });

  it('rejects a value below min or above max', () => {
    const column = { type: 'float', min: 0, max: 1 };
    expect(getBoundError(column, -0.1)).toBe('Min value: 0');
    expect(getBoundError(column, '1.5')).toBe('Max value: 1');
  });

  it('treats exclusive_min as strictly greater than', () => {
    const column = { type: 'float', exclusive_min: 0 };
    expect(getBoundError(column, 0)).toBe('Must be greater than 0');
    expect(getBoundError(column, 0.001)).toBeNull();
  });

  it('has nothing to say about an empty value', () => {
    const column = { type: 'int', min: 1, nullable: true };
    expect(getBoundError(column, '')).toBeNull();
    expect(getBoundError(column, null)).toBeNull();
    expect(getBoundError(column, undefined)).toBeNull();
  });

  it('leaves non-numbers to the type validators', () => {
    expect(getBoundError({ type: 'int', min: 1 }, 'abc')).toBeNull();
  });

  it('is a no-op for a column with no bounds', () => {
    expect(getBoundError({ type: 'int' }, -5)).toBeNull();
    expect(getBoundError(undefined, -5)).toBeNull();
  });
});

describe('getColumnPropsFromDataType bounds', () => {
  const boundValidator = (columnSchema) =>
    getColumnPropsFromDataType(columnSchema, 'col').validator.find(
      (v) => typeof v === 'object' && v.type,
    ).type;

  it('rejects an out-of-bound cell edit', () => {
    const valid = boundValidator({ type: 'int', min: 1 });
    expect(valid(null, 0)).toBe(false);
    expect(valid(null, 1)).toBe(true);
  });

  it('lets a nullable column be cleared', () => {
    const valid = boundValidator({ type: 'float', min: 0, nullable: true });
    expect(valid(null, '')).toBe(true);
    expect(valid(null, null)).toBe(true);
  });
});

describe('getColumnPropsFromDataType nullable', () => {
  it('maps clearing a nullable number to null, not 0', () => {
    const { mutatorEdit } = getColumnPropsFromDataType(
      { type: 'float', nullable: true },
      'height_vd',
    );
    expect(mutatorEdit('')).toBeNull();
    expect(mutatorEdit('3.5')).toBe(3.5);
  });

  it('requires a value in a column that is not nullable', () => {
    const { validator } = getColumnPropsFromDataType(
      { type: 'int' },
      'floors_ag',
    );
    expect(validator).toContain('required');
  });
});
