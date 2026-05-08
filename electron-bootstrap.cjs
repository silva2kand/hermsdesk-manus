if (process.env.ELECTRON_RUN_AS_NODE) {
  const { spawn } = require('node:child_process');
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === 'ELECTRON_RUN_AS_NODE') delete env[key];
  }
  const isDevElectron = /node_modules[\\/]+electron[\\/]+dist[\\/]+electron/i.test(process.execPath);
  const child = spawn(process.execPath, isDevElectron ? process.argv.slice(1) : [], {
    detached: true,
    stdio: 'ignore',
    env,
    windowsHide: true,
  });
  child.unref();
  process.exit(0);
}

import('./dist-electron/main.js').catch((error) => {
  console.error('Failed to start HermsDesk Electron main process:', error);
  process.exitCode = 1;
});
