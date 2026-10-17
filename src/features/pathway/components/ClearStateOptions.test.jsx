import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ClearStateOptions from './ClearStateOptions';

const STATES = [
  { year: 2026, hasInputs: true, hasOutputs: true, removesLogEntry: false },
  { year: 2039, hasInputs: true, hasOutputs: false, removesLogEntry: true },
  { year: 2040, hasInputs: false, hasOutputs: true, removesLogEntry: false },
];

const renderOptions = (defaults) => {
  const onChange = vi.fn();
  render(
    <ClearStateOptions
      states={STATES}
      defaults={defaults}
      onChange={onChange}
    />,
  );
  return onChange;
};

const box = (name) => screen.getByRole('checkbox', { name: new RegExp(name) });

describe('ClearStateOptions', () => {
  it('offers every clearable year, with the selected one checked', () => {
    renderOptions({ years: [2039], inputs: true, outputs: true });
    expect(box('^2026$')).not.toBeChecked();
    expect(box('^2039$')).toBeChecked();
    expect(box('^2040$')).not.toBeChecked();
  });

  it('adds years in order and selects all at once', () => {
    const onChange = renderOptions({
      years: [2039],
      inputs: true,
      outputs: true,
    });
    fireEvent.click(box('^2026$'));
    expect(onChange).toHaveBeenLastCalledWith({
      years: [2026, 2039],
      inputs: true,
      outputs: true,
    });
    fireEvent.click(box('Select all'));
    expect(onChange).toHaveBeenLastCalledWith({
      years: [2026, 2039, 2040],
      inputs: true,
      outputs: true,
    });
  });

  it('enables inputs and outputs only when a chosen year has them', () => {
    renderOptions({ years: [2040], inputs: false, outputs: true });
    // 2040 has only outputs on disk.
    expect(box('Inputs')).toBeDisabled();
    expect(box('Outputs')).toBeEnabled();
    fireEvent.click(box('^2039$'));
    expect(box('Inputs')).toBeEnabled();
  });

  it('reports only what the chosen years can clear', () => {
    const onChange = renderOptions({
      years: [2039, 2040],
      inputs: true,
      outputs: true,
    });
    // 2039 is the only chosen year with inputs: without it, only outputs remain.
    fireEvent.click(box('^2039$'));
    expect(onChange).toHaveBeenLastCalledWith({
      years: [2040],
      inputs: false,
      outputs: true,
    });
    expect(box('Inputs')).not.toBeChecked();
    // Choosing it again brings the ticked inputs back.
    fireEvent.click(box('^2039$'));
    expect(onChange).toHaveBeenLastCalledWith({
      years: [2039, 2040],
      inputs: true,
      outputs: true,
    });
  });

  it('clears outputs along with inputs', () => {
    const onChange = renderOptions({
      years: [2026],
      inputs: false,
      outputs: false,
    });
    fireEvent.click(box('Inputs'));
    expect(onChange).toHaveBeenLastCalledWith({
      years: [2026],
      inputs: true,
      outputs: true,
    });
    expect(box('Outputs')).toBeDisabled();
  });
});
