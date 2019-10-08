'use strict';

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { format as formatUrl } from 'url';
import menu from './menu';

const isDevelopment = process.env.NODE_ENV !== 'production';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;

// Add Menu to application
Menu.setApplicationMenu(menu);

function createMainWindow() {
  const window = new BrowserWindow({
    minWidth: 600,
    minHeight: 300,
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

/**
 * Add event listeners...
 */

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
    path => {
      if (path && path.length) {
        event.sender.send('selected-project', path[0]);
      }
    }
  );
});

/**
 * Hot Loader
 */

if (module.hot) {
  module.hot.accept();
}
