'use strict';

import { app, BrowserWindow, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { format as formatUrl } from 'url';
import menu from './menu';
import axios from 'axios';

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let ceaProcess;

// TEMP SOLUTION. Should load from config
const CEA_URL = 'http://localhost:5050';

// Add Menu to application
Menu.setApplicationMenu(menu);

function createMainWindow() {
  const window = new BrowserWindow({
    minWidth: 600,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden', // or 'customButtonsOnHover',
    webPreferences: { nodeIntegration: true }
  });

  window.webContents.on('did-frame-finish-load', () => {
    if (isDevelopment) {
      window.webContents.openDevTools();
    }
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

function startCEA() {
  let cea;
  if (process.platform === 'win32') {
    let scriptPath = path.join(
      path.dirname(process.execPath),
      '/../',
      'dashboard.bat'
    );
    // Fallback to default install path
    if (!fs.existsSync(scriptPath))
      scriptPath = path.join(
        process.env.USERPROFILE,
        'Documents',
        'CityEnergyAnalyst',
        'dashboard.bat'
      );
    console.log(scriptPath);
    cea = require('child_process').spawn('cmd.exe', ['/c', scriptPath]);
  }

  cea.stdout.on('data', function(data) {
    console.log(data.toString('utf8'));
  });

  cea.stderr.on('data', function(data) {
    dialog.showMessageBox({ message: data.toString('utf8') });
  });

  return cea;
}

function checkCEAStarted(callback) {
  let timeout;
  const runCallbackOnce = (() => {
    let executed = false;
    return () => {
      if (!executed) {
        executed = true;
        callback();
      }
    };
  })();

  // Check every 1 seconds
  const interval = setInterval(async () => {
    try {
      const resp = await axios.get(`${CEA_URL}/server/alive`);
      if (resp.status == 200) {
        clearInterval(interval);
        timeout && clearTimeout(timeout);
        runCallbackOnce();
      }
    } catch (error) {
      !error.status && console.log(error);
    }
  }, 1000);

  // Stop checking after 1 min
  timeout = setTimeout(() => {
    clearInterval(interval);
  }, 60000);
}

/**
 * Add event listeners...
 */

app.on('will-quit', event => {
  if (!isDevelopment) {
    event.preventDefault();
    const shutdown = async () => {
      try {
        const resp = await axios.post(`${CEA_URL}/server/shutdown`);
        app.exit();
      } catch (error) {
        dialog.showMessageBox({ message: error });
      }
    };
    shutdown();
  }
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

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  // Only autostart CEA server in production
  if (isDevelopment) {
    mainWindow = createMainWindow();
  } else {
    ceaProcess = startCEA();
    checkCEAStarted(() => {
      mainWindow = createMainWindow();
    });
  }
});

/**
 * Hot Loader
 */

if (module.hot) {
  module.hot.accept();
}
