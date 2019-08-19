import axios from 'axios';

export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const RECEIVE_INPUTDATA = 'RECEIVE_INPUTDATA';

// function shouldFetchInputData(state) {
//   const data = state.inputData.data;
//   return !Object.keys(data).length;
// }

// export const fetchInputData = () => {
//   return (_dispatch, getState) => {
//     if (shouldFetchInputData(getState())) {
//       return _dispatch(dispatch => {
//         dispatch({
//           type: REQUEST_INPUTDATA,
//           payload: { isFetching: true, error: null }
//         });
//         return axios
//           .get(`http://localhost:5050/api/tools`)
//           .then(response => {
//             dispatch({
//               type: RECEIVE_INPUTDATA,
//               payload: { tools: response.data, isFetching: false }
//             });
//             return response.data;
//           })
//           .catch(error => {
//             dispatch({
//               type: RECEIVE_INPUTDATA,
//               payload: {
//                 error: { message: error },
//                 isFetching: false
//               }
//             });
//           });
//       });
//     }
//   };
// };
