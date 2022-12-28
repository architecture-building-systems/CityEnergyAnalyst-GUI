import { SET_COLLAPSED } from '../actions/homepage';

const sider = (state = { collapsed: true }, { type, payload }) => {
  switch (type) {
    case SET_COLLAPSED:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default sider;
