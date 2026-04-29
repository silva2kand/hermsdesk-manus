import { shell, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

export class DesktopIntegrationService {
  async openExternalApp(app: string) {
    switch (app.toLowerCase()) {
      case 'whatsapp':
        return shell.openExternal('whatsapp://');
      case 'outlook':
        return shell.openExternal('outlook://');
      case 'gmail':
        return shell.openExternal('https://mail.google.com');
      default:
        return false;
    }
  }

  async selectFiles() {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    });
    return result.filePaths;
  }

  async selectFolder() {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  }

  async analyzeUKProfessionalDocs(filePath: string, type: 'legal' | 'tax') {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    return {
      type,
      fileName: path.basename(filePath),
      filePath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      lineCount: lines.length,
      excerpt: content.slice(0, 4000),
      status: 'Ready for approved AI review'
    };
  }
}
