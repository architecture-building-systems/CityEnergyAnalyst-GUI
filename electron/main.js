const {
  app,
  BrowserWindow,
  screen: electronScreen,
  ipcMain,
  dialog,
  shell,
} = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

const createMainWindow = () => {
  let mainWindow = new BrowserWindow({
    width: electronScreen.getPrimaryDisplay().workArea.width,
    height: electronScreen.getPrimaryDisplay().workArea.height,
    show: false,
    backgroundColor: 'white',
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      devTools: isDev,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });

  return mainWindow;
};

app.whenReady().then(() => {
  const mainWindow = createMainWindow();

  ipcMain.handle('open-dialog', async (_, arg) => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, arg);
    return filePaths;
  });

  ipcMain.handle('open-external', async (_, { url }) => {
    shell.openExternal(url);
  });

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
