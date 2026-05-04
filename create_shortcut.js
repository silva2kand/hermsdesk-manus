const { DesktopIntegrationService } = require('./electron/services/DesktopIntegrationService');
const service = new DesktopIntegrationService();
service.createDesktopShortcut().then(res => {
  console.log('Shortcut creation result:', res);
  process.exit(0);
}).catch(err => {
  console.error('Error creating shortcut:', err);
  process.exit(1);
});
