import React, { createContext, useState } from 'react';

export const ModalContext = createContext();
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
    setVisible(oldValue => ({ ...oldValue, [modal]: visible }));
  };

  return (
    <ModalContext.Provider
      value={{
        modals: modals,
        visible: visible,
        setModalVisible: setModalVisible
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
