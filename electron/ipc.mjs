import { ipcMain, dialog, shell } from 'electron';

export function registerIpcHandlers({ getMainWindow, appVersion }) {
  ipcMain.handle('open-dialog', async (_, arg) => {
    const { filePaths } = await dialog.showOpenDialog(getMainWindow(), arg);
    return filePaths;
  });

  ipcMain.handle('open-external', async (_, { url }) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('get-app-version', () => appVersion);
}
