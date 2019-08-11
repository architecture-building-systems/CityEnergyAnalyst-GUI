import { GET_PROJECT } from '../actions/project';

const project = (state = {}, { type, payload }) => {
  switch (type) {
    case GET_PROJECT:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default project;
