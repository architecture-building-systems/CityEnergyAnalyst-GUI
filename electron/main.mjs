import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path, { dirname } from 'path';

import { isCEAAlive, createCEAProcess, killCEAProcess } from './ceaProcess.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
const CEA_HOST = '127.0.0.1';
const CEA_PORT = '5050';
const CEA_URL = `http://${CEA_HOST}:${CEA_PORT}`;

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let splashWindow;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('ready', () => {
    createSplashWindow(CEA_URL);
  });

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createMainWindow();
    }
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
        const resp = await fetch(`${CEA_URL}/server/shutdown`, {
          method: 'POST',
        });
        const content = await resp.json();
        console.log(content);
      } catch (error) {
        console.error(error);
      } finally {
        // Make sure CEA process is killed
        killCEAProcess();
      }
      app.exit();
    };
    shutdown();
  });
}

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: 'white',
    autoHideMenuBar: true,
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
    splashWindow && splashWindow.close();
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

function createSplashWindow(url) {
  splashWindow = new BrowserWindow({
    height: 300,
    width: 500,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // hides the traffic lights for macOS
  if (process.platform == 'darwin')
    splashWindow.setWindowButtonVisibility(false);

  if (isDev) {
    splashWindow.loadURL('http://localhost:5173/splash');
    splashWindow.openDevTools();
  } else {
    splashWindow.loadURL(
      `file://${path.join(__dirname, '../dist/index.html#splash')}`,
    );
  }

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();

    // Check if CEA server is already running, only start if not
    isCEAAlive(url)
      .then((alive) => {
        if (alive) {
          console.log('cea dashboard already running...');
          createMainWindow();
        } else {
          console.log('cea dashboard not running, starting...');
          createCEAProcess(url, () => {
            console.log('cea dashboard process created...');
            createMainWindow();
          });
        }
      })
      .then(() => {
        console.log('closing splash');
      });
  });

  splashWindow.on('closed', () => {
    !mainWindow && killCEAProcess();
    splashWindow = null;
  });
}

ipcMain.handle('open-dialog', async (_, arg) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, arg);
  return filePaths;
});

ipcMain.handle('open-external', async (_, { url }) => {
  shell.openExternal(url);
});
