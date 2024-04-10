const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: async (channel, data) => {
    try {
      return await ipcRenderer.invoke(channel, data);
    } catch (e) {
      console.error(e);
    }
  },
  onPreflightEvent: (callback) =>
    ipcRenderer.on('preflightEvents', (_event, value) => callback(value)),
  removePreflightEventListener: (callback) =>
    ipcRenderer.removeListener('preflightEvents', callback),
});
