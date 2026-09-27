import { describe, it, expect } from 'vitest';
import { splitCsvLine, readCsvHeaderColumns } from './csv';

describe('splitCsvLine', () => {
  it('splits a plain comma-separated line', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace around fields', () => {
    expect(splitCsvLine(' a , b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas inside quoted fields intact', () => {
    expect(splitCsvLine('a,"b, with comma",c')).toEqual([
      'a',
      'b, with comma',
      'c',
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(splitCsvLine('a,"say ""hi""",c')).toEqual(['a', 'say "hi"', 'c']);
  });

  it('handles a single column', () => {
    expect(splitCsvLine('only')).toEqual(['only']);
  });
});

describe('readCsvHeaderColumns', () => {
  const makeFile = (content) =>
    new File([content], 'test.csv', { type: 'text/csv' });

  it('reads the header row of a well-formed CSV', async () => {
    const file = makeFile(
      'Date,Carbon intensity gCO2eq/kWh (direct)\n2026-01-01,123\n',
    );
    await expect(readCsvHeaderColumns(file)).resolves.toEqual([
      'Date',
      'Carbon intensity gCO2eq/kWh (direct)',
    ]);
  });

  it('handles CRLF line endings', async () => {
    const file = makeFile('a,b\r\n1,2\r\n');
    await expect(readCsvHeaderColumns(file)).resolves.toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty file', async () => {
    const file = makeFile('');
    await expect(readCsvHeaderColumns(file)).resolves.toEqual([]);
  });

  it('only reads the header row, not the whole file', async () => {
    const hugeBody = 'a,b\n' + '1,2\n'.repeat(100000);
    const file = makeFile(hugeBody);
    await expect(readCsvHeaderColumns(file)).resolves.toEqual(['a', 'b']);
  });
});
