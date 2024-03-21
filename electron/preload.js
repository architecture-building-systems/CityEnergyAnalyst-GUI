const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: async (channel, data) => {
    try {
      return await ipcRenderer.invoke(channel, data);
    } catch (e) {
      console.log(e);
    }
  },
});
