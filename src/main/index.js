'use strict';

import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { createCEAProcess, isCEAAlive, killCEAProcess } from './ceaProcess';
import menu from './menu';
import axios from 'axios';
import ini from 'ini';
import os from 'os';
import fs from 'fs';

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let splashWindow;

// TEMP SOLUTION. Should check for errors (file doesn't exist)
const cea_config = ini.parse(
  fs.readFileSync(path.join(os.homedir(), 'cea.config'), 'utf-8')
);
const CEA_URL = `${cea_config.server.protocol}://${cea_config.server.host}:${cea_config.server.port}`;
console.log(`CEA_URL: ${CEA_URL}`);
process.env.CEA_URL = CEA_URL;

// Add Menu to application
Menu.setApplicationMenu(menu);

function createMainWindow() {
  const window = new BrowserWindow({
    minWidth: 600,
    minHeight: 600,
    show: false, // starts hidden until page is loaded
    frame: false,
    titleBarStyle: 'hidden', // or 'customButtonsOnHover',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.webContents.on('did-frame-finish-load', () => {
    if (isDevelopment) {
      window.webContents.openDevTools();
    }
  });

  window.once('ready-to-show', () => {
    window.show();
    window.maximize();
    splashWindow && splashWindow.close();
  });

  window.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}`);

  window.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  // Set window handlers
  window.on('maximize', () => {
    window.webContents.send('main-window-maximize');
  });
  window.on('unmaximize', () => {
    window.webContents.send('main-window-unmaximize');
  });
  ipcMain.handle('main-window-close', () => {
    window.close();
  });
  ipcMain.handle('main-window-minimize', () => {
    window.minimize();
  });
  ipcMain.handle('main-window-restore', () => {
    window.restore();
  });
  ipcMain.handle('main-window-maximize', () => {
    window.maximize();
  });

  ipcMain.handle('open-dialog', async (_, arg) => {
    const { filePaths } = await dialog.showOpenDialog(window, arg);
    return filePaths;
  });

  ipcMain.handle('open-plot-window', (_, arg) => {
    const { index, dashIndex } = arg;

    let win = new BrowserWindow({
      title: 'City Energy Analyst | Loading Plot...',
      width: 800,
      height: 600,
    });
    win.removeMenu();
    win.on('closed', () => {
      win = null;
    });

    // Triggers savePage when 'Export to File' is clicked
    win.webContents.on('did-navigate-in-page', () => {
      dialog
        .showSaveDialog(win, {
          defaultPath: win.getTitle().split(' | ')[1],
          filters: [
            {
              name: 'HTML',
              extensions: ['html'],
            },
          ],
        })
        .then(({ filePath }) => {
          if (filePath) win.webContents.savePage(filePath, 'HTMLOnly');
        })
        .catch((error) => {
          console.error(error);
        });
    });

    win.loadURL(`${process.env.CEA_URL}/plots/plot/${dashIndex}/${index}`);
  });

  return window;
}

function createSplashWindow(url) {
  const window = new BrowserWindow({
    height: 300,
    width: 500,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.once('ready-to-show', () => {
    window.show();

    // Check if CEA server is already running, only start if not
    isCEAAlive(url).then((alive) => {
      if (alive) {
        console.log('cea dashboard already running...');
        mainWindow = createMainWindow();
      } else {
        console.log('cea dashboard not running, starting...');
        createCEAProcess(url, window, () => {
          console.log('cea dashboard process created...');
          mainWindow = createMainWindow();
        });
      }
    });
  });

  window.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}#splash`);

  window.on('closed', () => {
    !mainWindow && killCEAProcess();
    splashWindow = null;
  });

  return window;
}

/**
 * Add event listeners...
 */

app.on('will-quit', (event) => {
  event.preventDefault();
  const shutdown = async () => {
    try {
      const resp = await axios.post(`${CEA_URL}/server/shutdown`);
      console.log(resp);
    } catch (error) {
      console.log(error);
    }
    app.exit();
  };
  shutdown();
});

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create splash BrowserWindow when electron is ready
app.on('ready', () => {
  console.log(`app.on('ready'): CEA_URL=${CEA_URL}`);
  splashWindow = createSplashWindow(CEA_URL);
});
