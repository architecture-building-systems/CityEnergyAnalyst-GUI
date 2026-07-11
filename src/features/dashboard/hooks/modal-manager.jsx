import { useState } from 'react';

import { ModalContext } from '../context/modal-context';

export const ModalManager = ({ modals, children }) => {
  const [visible, setVisible] = useState(createState());

  function createState() {
    let state = {};
    for (const modal in modals) {
      state[modal] = false;
    }
    return state;
  }

  const setModalVisible = (modal, visible) => {
    setVisible((oldValue) => ({ ...oldValue, [modal]: visible }));
  };

  return (
    <ModalContext.Provider
      value={{
        modals: modals,
        visible: visible,
        setModalVisible: setModalVisible,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
