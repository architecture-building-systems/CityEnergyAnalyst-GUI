import log from 'electron-log';

export const initLog = () => {
  // Optional, initialize the logger for any renderer process
  log.initialize();

  console.log = log.log;
  console.error = log.error;
  console.debug = log.debug;

  return log;
};
