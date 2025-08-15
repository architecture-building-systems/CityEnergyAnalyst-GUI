import { spawn, execSync } from 'child_process';

import { app, dialog } from 'electron';

import { getMicromambaPath, getCEARootPath } from './env.mjs';

let cea;
let ceaDetached = false;
let timeout;
let interval;
let startupError = '';

export function createCEAProcess(url, BrowserWindow, callback) {
  console.log(`createCEAProcess(${url})`);

  const spawnOptions = {
    // Create a new process group on Unix-like systems to facilitate killing child processes
    detached: process.platform !== 'win32',
  };

  ceaDetached = spawnOptions.detached;

  // For windows
  if (process.platform === 'win32') {
    cea = spawn(
      getMicromambaPath(),
      ['-r', getCEARootPath(), '-n', 'cea', 'run', 'cea', 'dashboard'],
      spawnOptions,
    );
  } else if (process.platform === 'darwin') {
    cea = spawn(
      getMicromambaPath(),
      ['-r', getCEARootPath(), '-n', 'cea', 'run', 'cea', 'dashboard'],
      spawnOptions,
    );
  }

  if (cea) {
    console.debug('CEA process started with PID:', cea.pid);

    // Attach cea output to console
    cea.stdout.on('data', function (data) {
      console.log(data.toString('utf8').trim());
    });

    cea.stderr.on('data', function (data) {
      const message = data.toString('utf8').trim();
      // Check if the message contains actual error levels
      if (
        message.includes('ERROR') ||
        message.includes('CRITICAL') ||
        message.includes('FATAL')
      ) {
        console.error(message);
      } else {
        // Treat INFO, DEBUG, WARNING as regular log messages
        console.log(message);
      }
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
  return new Promise((resolve, reject) => {
    if (cea) {
      // Remove exit listeners that show startup error
      cea.removeAllListeners('exit');
      const ceaPid = cea.pid;

      if (process.platform === 'win32') {
        // Graceful shutdown for Windows using taskkill
        console.debug(
          `Attempting graceful shutdown of CEA process tree (PID: ${ceaPid})`,
        );
        try {
          // First try graceful termination
          execSync(`taskkill /PID ${ceaPid} /T`);
          console.debug('Sent termination signal to CEA process tree');

          // Set timeout for force kill
          const forceKillTimeout = setTimeout(() => {
            try {
              // Check if process still exists before force killing
              execSync(`tasklist /FI "PID eq ${ceaPid}" | findstr ${ceaPid}`, {
                stdio: 'ignore',
              });
              console.debug('CEA process still running, force killing...');
              execSync(`taskkill /PID ${ceaPid} /T /F`);
              console.debug('CEA process force killed');
              resolve();
            } catch (error) {
              // Process likely already terminated
              console.debug('CEA process already terminated');
              resolve();
            }
          }, killTimeout);

          // Listen for process exit to clear timeout and resolve
          const exitHandler = () => {
            clearTimeout(forceKillTimeout);
            console.debug('CEA process terminated gracefully');
            resolve();
          };

          cea.once('exit', exitHandler);
        } catch (error) {
          console.error(`Error during graceful shutdown: ${error?.message}`);
          // Fallback to force kill
          try {
            execSync(`taskkill /PID ${ceaPid} /T /F`);
            console.debug('CEA process force killed as fallback');
            resolve();
          } catch (forceError) {
            console.error(
              `Error force killing process: ${forceError?.message}`,
            );
            reject(forceError);
          }
        }
      } else {
        // Unix-like systems (macOS, Linux)
        try {
          console.debug(
            `Attempting graceful shutdown of CEA process tree (PID: ${ceaPid})`,
          );

          // For detached processes, kill the process group
          // For non-detached processes, try to get the process group ID
          let targetPid = ceaPid;
          let isProcessGroup = false;

          try {
            if (ceaDetached) {
              // Process is detached, kill the entire process group
              targetPid = -ceaPid;
              isProcessGroup = true;
              console.debug(`Targeting process group: ${ceaPid}`);
            } else {
              // Try to get the process group ID
              const pgid = process.getpgid(ceaPid);
              if (pgid !== ceaPid) {
                targetPid = -pgid;
                isProcessGroup = true;
                console.debug(`Targeting process group: ${pgid}`);
              } else {
                console.debug(`Targeting single process: ${ceaPid}`);
              }
            }
          } catch (pgidError) {
            console.debug(
              'Could not get process group, targeting single process',
            );
            targetPid = ceaPid;
          }

          // Send SIGTERM first
          process.kill(targetPid, 'SIGTERM');
          console.debug(
            `Sent SIGTERM to ${isProcessGroup ? 'process group' : 'process'}: ${Math.abs(targetPid)}`,
          );

          // Set timeout for SIGKILL
          const forceKillTimeout = setTimeout(() => {
            try {
              console.debug(
                `Timeout reached, sending SIGKILL to ${isProcessGroup ? 'process group' : 'process'}: ${Math.abs(targetPid)}`,
              );
              process.kill(targetPid, 'SIGKILL');
              console.debug('Sent SIGKILL successfully');
              resolve();
            } catch (killError) {
              if (killError.code === 'ESRCH') {
                console.debug('Process/group already terminated');
                resolve();
              } else {
                console.error(`Error sending SIGKILL: ${killError?.message}`);
                reject(killError);
              }
            }
          }, killTimeout);

          // Listen for process exit to clear timeout and resolve
          const exitHandler = () => {
            clearTimeout(forceKillTimeout);
            console.debug('CEA process terminated gracefully');
            resolve();
          };

          cea.once('exit', exitHandler);
        } catch (error) {
          if (error.code === 'ESRCH') {
            console.debug('CEA process not found (already terminated)');
            resolve();
          } else {
            console.error(`Error killing CEA process: ${error?.message}`);
            // Fallback: try to kill just the main process with SIGKILL
            try {
              process.kill(ceaPid, 'SIGKILL');
              console.debug('Fallback: sent SIGKILL to main CEA process');
              resolve();
            } catch (fallbackError) {
              console.error(`Fallback kill failed: ${fallbackError?.message}`);
              reject(fallbackError);
            }
          }
        }
      }

      console.debug(
        `Initiated shutdown sequence for CEA process (PID: ${ceaPid})`,
      );
    } else {
      console.debug('CEA process not found. Ignoring...');
      resolve();
    }
    interval && clearInterval(interval);
    timeout && clearTimeout(timeout);
  });
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
