globalThis.__electronModule = require('electron');

import('./dist-electron/main.js').catch((error) => {
  console.error('Failed to start HermsDesk Electron main process:', error);
  process.exitCode = 1;
});
