import { spawn, execSync } from 'child_process';

import { app, dialog } from 'electron';

import { getMicromambaPath, getCEARootPath } from './env.mjs';

let cea;
let timeout;
let interval;
let startupError = '';

export function createCEAProcess(url, BrowserWindow, callback) {
  console.log(`createCEAProcess(${url})`);
  // For windows
  if (process.platform === 'win32') {
    cea = spawn(getMicromambaPath(), [
      '-r',
      getCEARootPath(),
      '-n',
      'cea',
      'run',
      'cea',
      'dashboard',
    ]);
  } else if (process.platform === 'darwin') {
    cea = spawn(getMicromambaPath(), [
      '-r',
      getCEARootPath(),
      '-n',
      'cea',
      'run',
      'cea',
      'dashboard',
    ]);
  }

  if (cea) {
    console.debug('CEA process started with PID:', cea.pid);

    // Attach cea output to console
    cea.stdout.on('data', function (data) {
      console.log(data.toString('utf8').trim());
    });

    cea.stderr.on('data', function (data) {
      console.error(data.toString('utf8').trim());
    });

    // Show Error message box when CEA encounters any error on startup
    cea.stderr.on('data', saveStartupError);
    cea.on('exit', () => {
      cea = null;
      showStartupError();
    });
  }

  function saveStartupError(message) {
    startupError += message.toString('utf8');
  }

  function showStartupError() {
    dialog.showMessageBoxSync(BrowserWindow, {
      type: 'error',
      title: 'CEA Error',
      message: 'CEA has encounted an error on startup',
      detail: startupError,
      buttons: ['Exit CEA'],
    });
    app.exit();
  }

  checkCEAStarted(url, () => {
    // Remove Error message box listener after successful startup
    if (cea) {
      cea.stderr.removeListener('data', saveStartupError);
      cea.removeListener('exit', showStartupError);
    }
    callback();
  });

  return cea;
}

// Kill process and stop all timed events
export function killCEAProcess(killTimeout = 10000) {
  if (cea) {
    cea.removeAllListeners('exit');
    let result = false;

    if (process.platform === 'win32') {
      // FIXME: Force kill on windows for now
      console.debug('Forcing process kill using taskkill on Windows');
      try {
        execSync(`taskkill /PID ${cea.pid} /T /F`);
        result = true;
      } catch (error) {
        console.error(`Error killing process: ${error?.message}`);
      }
    } else {
      try {
        setTimeout(() => process.kill(cea.pid, 'SIGKILL'), killTimeout);

        result = process.kill(cea.pid, 'SIGTERM');
      } catch (error) {
        if (error.code === 'ESRCH') {
          console.error('Unable to kill CEA process. (Process not found)');
        } else {
          console.error(error);
        }
      }
    }

    if (result) {
      console.debug('CEA process killed with PID:', cea.pid);
    } else {
      console.error('Failed to kill CEA process with PID:', cea.pid);
    }
  } else {
    console.debug('CEA process not found. Ignoring...');
  }
  interval && clearInterval(interval);
  timeout && clearTimeout(timeout);
}

export async function isCEAAlive(url) {
  console.debug(`isCEAAlive(${url})`);
  try {
    const { status } = await fetch(`${url}/server/alive`);
    return status == 200;
  } catch (error) {
    console.error(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(url, callback) {
  console.debug(`checkCEAStarted(${url})`);
  const runCallbackOnce = (() => {
    let executed = false;
    return () => {
      if (!executed) {
        executed = true;
        callback();
      }
    };
  })();

  // Check every 3 seconds
  var bound_url = url;
  console.debug(`checkCEAStarted(bound_url=${bound_url})`);
  interval = setInterval(async () => {
    const alive = await isCEAAlive(bound_url);
    if (alive) {
      clearInterval(interval);
      timeout && clearTimeout(timeout);
      runCallbackOnce();
    }
  }, 3000);

  // Stop checking after 5 min
  timeout = setTimeout(() => {
    clearInterval(interval);
  }, 300000);
}
