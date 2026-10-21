import { Checkbox } from 'antd';
import { useState } from 'react';

/**
 * Body of the Clear State confirm dialog: pick the state years, and which halves of each
 * state to remove.
 *
 * Modal.confirm renders its content once and cannot re-render on state change, so this owns
 * the checkbox state locally and writes it through to a mutable object the caller reads on OK.
 * It keeps what the user ticked, but shows and reports only what the chosen years can clear,
 * so un-ticking the only year with inputs does not leave a hidden "inputs" behind.
 *
 * Clearing inputs implies clearing outputs: the state folder is itself a scenario, so results
 * without inputs can neither be regenerated nor interpreted, and the backend removes the whole
 * folder in that case.
 *
 * @param {Array<{year: number, hasInputs: boolean, hasOutputs: boolean, removesLogEntry: boolean}>} states
 *   The years with something on disk to clear.
 */
// What `years` can clear, given what the user ticked.
const resolveSelection = (states, years, inputs, outputs) => {
  const chosen = states.filter((state) => years.includes(state.year));
  const canInputs = chosen.some((s) => s.hasInputs || s.removesLogEntry);
  const canOutputs = chosen.some((s) => s.hasOutputs);
  const clearInputs = inputs && canInputs;
  return {
    chosen,
    canInputs,
    canOutputs,
    selection: {
      years,
      inputs: clearInputs,
      outputs: clearInputs || (outputs && canOutputs),
    },
  };
};

const ClearStateOptions = ({ states, defaults, onChange }) => {
  const [years, setYears] = useState(defaults.years);
  const [inputs, setInputs] = useState(defaults.inputs);
  const [outputs, setOutputs] = useState(defaults.outputs);

  const apply = (nextYears, nextInputs, nextOutputs) => {
    setYears(nextYears);
    setInputs(nextInputs);
    setOutputs(nextOutputs);
    onChange(
      resolveSelection(states, nextYears, nextInputs, nextOutputs).selection,
    );
  };
  const toggleYear = (year, checked) =>
    apply(
      checked
        ? [...years, year].sort((a, b) => a - b)
        : years.filter((y) => y !== year),
      inputs,
      outputs,
    );

  const { chosen, canInputs, canOutputs, selection } = resolveSelection(
    states,
    years,
    inputs,
    outputs,
  );

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 8 }}>State years to clear:</div>
      {states.length > 1 && (
        <Checkbox
          checked={years.length === states.length}
          indeterminate={years.length > 0 && years.length < states.length}
          onChange={(e) =>
            apply(
              e.target.checked ? states.map((s) => s.year) : [],
              inputs,
              outputs,
            )
          }
        >
          Select all
        </Checkbox>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 12px',
          margin: '4px 0 16px',
        }}
      >
        {states.map((state) => (
          <Checkbox
            key={state.year}
            checked={years.includes(state.year)}
            onChange={(e) => toggleYear(state.year, e.target.checked)}
          >
            {state.year}
          </Checkbox>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        Select what to remove for these state years.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Checkbox
          checked={selection.inputs}
          disabled={!canInputs}
          onChange={(e) => apply(years, e.target.checked, outputs)}
        >
          Inputs
          <div style={{ fontSize: 12, color: '#888', marginLeft: 24 }}>
            {chosen.some((s) => s.removesLogEntry)
              ? 'The baked state folder, any manual content for the year in the pathway log, and the outputs.'
              : 'The baked state folder, and the outputs.'}
            {chosen.length && !canInputs ? ' (nothing on disk)' : ''}
          </div>
        </Checkbox>
        <Checkbox
          checked={selection.outputs}
          disabled={!canOutputs || selection.inputs}
          onChange={(e) => apply(years, inputs, e.target.checked)}
        >
          Outputs
          <div style={{ fontSize: 12, color: '#888', marginLeft: 24 }}>
            Simulation results. The state stays baked and can be re-simulated.
            {chosen.length && !canOutputs ? ' (nothing on disk)' : ''}
          </div>
        </Checkbox>
      </div>
    </div>
  );
};

export default ClearStateOptions;
