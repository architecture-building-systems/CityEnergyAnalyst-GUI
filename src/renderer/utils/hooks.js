import { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import produce from 'immer';

export const useAsyncData = (
  url = '',
  initialState = null,
  dependecies = []
) => {
  const [data, setData] = useState(initialState);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await axios.get(url);
        console.log(resp.data);
        setData(resp.data);
      } catch (err) {
        console.log(err.response.data);
        setError(err.response.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [...dependecies]);

  return [data, isLoading, error];
};

function forwardTimeline(timeline, newPresent) {
  return produce(timeline, draft => {
    draft.past.push(draft.present);
    draft.present = newPresent;
    draft.future = [];
  });
}

function undoTimeline(timeline) {
  return produce(timeline, draft => {
    if (!draft.past.length) return;
    const newPresent = draft.past.pop();
    draft.future.unshift(draft.present);
    draft.present = newPresent;
  });
}

function redoTimelne(timeline) {
  return produce(timeline, draft => {
    if (!draft.future.length) return;
    const newPresent = draft.future.shift();
    draft.past.push(draft.present);
    draft.present = newPresent;
  });
}

function resetTimeline(timeline) {
  return produce(timeline, draft => {
    if (!draft.past.length) return;
    const newPresent = draft.past.shift();
    draft.future = [...draft.past, draft.present, ...draft.future];
    draft.present = newPresent;
    draft.past = [];
  });
}

// From https://frontarm.com/swyx/reusable-time-travel-react-hooks-immer/
export function useUndoRedo(reducer, initialState) {
  const initialTimeline = {
    past: [],
    present: initialState,
    future: []
  };

  const undoRedoReducer = (tl, action) => {
    if (action === 'UNDO') return undoTimeline(tl);
    if (action === 'REDO') return redoTimelne(tl);
    if (action === 'RESET') return resetTimeline(tl);
    const newState = produce(tl.present, draft => reducer(draft, action));
    console.log(newState);
    return forwardTimeline(tl, newState);
  };

  const [timeline, dispatch] = useReducer(undoRedoReducer, initialTimeline);

  return {
    state: timeline.present,
    timeline,
    dispatch,
    doUndo: () => dispatch('UNDO'),
    doRedo: () => dispatch('REDO'),
    doReset: () => dispatch('RESET')
  };
}
