'use strict';

import { app, BrowserWindow, dialog, Menu } from 'electron';
import path from 'path';
import { format as formatUrl } from 'url';
import { createCEAProcess, isCEAAlive } from './ceaProcess';
import menu from './menu';
import axios from 'axios';

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let splashWindow;

// TEMP SOLUTION. Should load from config or env
const CEA_URL = 'http://localhost:5050';
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
    webPreferences: { nodeIntegration: true }
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

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
      })
    );
  }

  window.on('closed', () => {
    mainWindow = null;
  });

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

function createSplashWindow() {
  const window = new BrowserWindow({
    height: 300,
    width: 500,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: { nodeIntegration: true }
  });

  window.once('ready-to-show', () => {
    window.show();

    // Check if CEA server is already running, only start if not
    isCEAAlive().then(alive => {
      if (alive) mainWindow = createMainWindow();
      else
        createCEAProcess(window, () => {
          mainWindow = createMainWindow();
        });
    });
  });

  if (isDevelopment) {
    window.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}/#/splash`
    );
  } else {
    window.loadURL(`file://${__dirname}/index.html#/splash`);
  }

  window.on('closed', () => {
    splashWindow = null;
  });

  return window;
}

/**
 * Add event listeners...
 */

app.on('will-quit', event => {
  event.preventDefault();
  const shutdown = async () => {
    try {
      const resp = await axios.post(`${CEA_URL}/server/shutdown`);
      resp.status == 200 && app.exit();
    } catch (error) {
      dialog.showMessageBox({ message: error });
    }
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
  splashWindow = createSplashWindow();
});

/**
 * Hot Loader
 */

if (module.hot) {
  module.hot.accept();
}
