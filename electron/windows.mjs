import { app, BrowserWindow, screen } from 'electron';
import path from 'path';

const getPreloadPath = () => {
  const appPath = app.getAppPath();
  if (app.isPackaged) {
    return path.join(appPath, 'dist-electron/preload.js');
  } else {
    // In dev mode, use the source preload.js directly
    return path.join(appPath, 'electron/preload.js');
  }
};

export function createMainWindow() {
  const displays = screen.getAllDisplays();
  // Find the primary display or the one with the highest resolution
  const primaryDisplay = displays.find((display) => display.isPrimary);
  const display =
    primaryDisplay ||
    displays.reduce((a, b) =>
      a.workArea.width * a.workArea.height >
        b.workArea.width * b.workArea.height
        ? a
        : b,
    );

  const mainWindow = new BrowserWindow({
    title: 'CEA-4 Desktop',
    show: false,
    width: Math.min(display.workArea.width, 1920),
    height: Math.min(display.workArea.height, 1080),
    backgroundColor: 'white',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.openDevTools();
  }

  // show the main window once it's ready to prevent flickering
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });

  return mainWindow;
}

export function createSplashWindow() {
  const splashWindow = new BrowserWindow({
    height: 300,
    width: 500,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  // hides the traffic lights for macOS
  if (process.platform == 'darwin')
    splashWindow.setWindowButtonVisibility(false);

  if (app.isPackaged) {
    splashWindow.loadURL(
      `file://${path.join(app.getAppPath(), 'dist/index.html#splash')}`,
    );
  } else {
    splashWindow.loadURL('http://localhost:5173/splash');
    splashWindow.openDevTools();
  }

  // show the splash window once it's ready to prevent flickering
  splashWindow.once('ready-to-show', () => splashWindow.show());

  return splashWindow;
}
