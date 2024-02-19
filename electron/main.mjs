import axios from 'axios';
import { app, BrowserWindow, screen, ipcMain, dialog, shell } from 'electron';
import path, { dirname } from 'path';

import { isCEAAlive, createCEAProcess } from './ceaProcess.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
const CEA_HOST = '127.0.0.1';
const CEA_PORT = '5050';
const CEA_URL = `http://${CEA_HOST}:${CEA_PORT}`;

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workArea.width,
    height: screen.getPrimaryDisplay().workArea.height,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });
};

app.whenReady().then(() => {
  createMainWindow();

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

app.on('ready', () => {
  const url = CEA_URL;
  // Check if CEA server is already running, only start if not
  isCEAAlive(url).then((alive) => {
    if (alive) {
      console.log('cea dashboard already running...');
    } else {
      console.log('cea dashboard not running, starting...');
      createCEAProcess(url, () => {
        console.log('cea dashboard process created...');
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', (event) => {
  event.preventDefault();
  const shutdown = async () => {
    try {
      const resp = await axios.post(`${CEA_URL}/server/shutdown`);
      console.log(resp?.data);
    } catch (error) {
      console.error(error);
    }
    app.exit();
  };
  shutdown();
});
