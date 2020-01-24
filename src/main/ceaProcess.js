import path from 'path';
import axios from 'axios';
import { app, dialog } from 'electron';

const isDevelopment = process.env.NODE_ENV !== 'production';

let cea;
let timeout;
let interval;
let ceaPath = getCEAPath();
global.ceaVersion = null;
global.guiVersion = isDevelopment
  ? require('../../package.json').version
  : app.getVersion();
const versionRegex = /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(?:0|[1-9]\d*)([0-9A-Za-z-]+)?/;

function getCEAPath() {
  let _path;
  if (isDevelopment) {
    if (process.platform === 'win32') {
      // NOTE: Assuming that CEA is cloned in Default Installation path
      // Default Installation
      _path = path.join(
        process.env.USERPROFILE,
        'Documents',
        'CityEnergyAnalyst'
      );
    }
  } else {
    // Get path relative to installed electron app
    _path = path.join(path.dirname(process.execPath), '/../');
  }
  return _path;
}

export function getCEAVersion() {
  // For windows
  if (process.platform === 'win32') {
    let pythonPath = path.join(ceaPath, 'Dependencies', 'Python', 'python.exe');
    const ceaOutput = require('child_process').spawnSync(
      pythonPath,
      ['-m', 'cea.interfaces.cli.cli', '--version'],
      { encoding: 'utf8' }
    );
    if (ceaOutput.stdout) {
      global.ceaVersion = ceaOutput.stdout.match(versionRegex)[0];
    }
  }
}

export function createCEAProcess(BrowserWindow, callback) {
  // For windows
  if (process.platform === 'win32') {
    let scriptPath = path.join(ceaPath, 'dashboard.bat');
    cea = require('child_process').spawn('cmd.exe', ['/c', scriptPath]);
  }

  cea.stdout.on('data', function(data) {
    console.log(data.toString('utf8'));
  });

  cea.stderr.on('data', function(data) {
    console.log(data.toString('utf8'));
  });

  // Show Error message box when CEA encounters any error on startup
  let startupError = '';
  cea.stderr.on('data', saveStartupError);
  cea.on('exit', showStartupError);

  function saveStartupError(message) {
    startupError += message.toString('utf8');
  }
  function showStartupError() {
    dialog.showMessageBox(BrowserWindow, {
      type: 'error',
      title: 'CEA Error',
      message: 'CEA has encounted an error on startup',
      detail: startupError,
      buttons: ['Exit CEA']
    });
    app.exit();
  }

  checkCEAStarted(() => {
    // Remove Error message box listener after successful startup
    cea.stderr.removeListener('data', saveStartupError);
    cea.removeListener('exit', showStartupError);
    callback();
  });

  return cea;
}

// Kill process and stop all timed events
export function killCEAProcess() {
  if (cea) {
    cea.removeAllListeners('exit');
    process.kill(cea.pid);
  }
  interval && clearInterval(interval);
  timeout && clearTimeout(timeout);
}

export async function isCEAAlive() {
  try {
    const resp = await axios.get(`${process.env.CEA_URL}/server/alive`);
    return resp.status == 200;
  } catch (error) {
    console.log(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(callback) {
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
  interval = setInterval(async () => {
    const alive = await isCEAAlive();
    if (alive) {
      clearInterval(interval);
      timeout && clearTimeout(timeout);
      runCallbackOnce();
    }
  }, 1000);

  // Stop checking after 1 min
  timeout = setTimeout(() => {
    clearInterval(interval);
  }, 60000);
}
