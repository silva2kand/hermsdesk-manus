const { app } = require('electron');
console.log('User Data:', app.getPath('userData'));
process.exit(0);
