const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAppVersion: async () => await ipcRenderer.invoke('get-app-version'),
  openDialog: async (options) =>
    await ipcRenderer.invoke('open-dialog', options),
  openExternal: async (url) =>
    await ipcRenderer.invoke('open-external', { url }),
  onPreflightEvent: (callback) =>
    ipcRenderer.on('preflightEvents', (_event, value) => callback(value)),
  removePreflightEventListener: (callback) =>
    ipcRenderer.removeListener('preflightEvents', callback),
});
