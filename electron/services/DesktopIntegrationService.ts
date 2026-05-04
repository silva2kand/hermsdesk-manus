import { shell, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import si from 'systeminformation';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execFileAsync = promisify(execFile);

export class DesktopIntegrationService {
  private async runPowerShellJson(script: string) {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script
    ], {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5,
      windowsHide: true
    });
    if (stderr && !stdout) throw new Error(stderr);
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  }

  private async getFolderSize(folderPath: string, limit = 5000) {
    let total = 0;
    let seen = 0;
    const walk = (dir: string) => {
      if (seen >= limit) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (seen >= limit) break;
        const fullPath = path.join(dir, entry.name);
        seen += 1;
        try {
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'dist-electron', 'release'].includes(entry.name)) {
              walk(fullPath);
            }
          } else {
            total += fs.statSync(fullPath).size;
          }
        } catch {
          // Ignore files locked by other processes.
        }
      }
    };
    walk(folderPath);
    return { bytes: total, partial: seen >= limit };
  }

  async getComputerOverview() {
    const cwd = process.cwd();
    const home = os.homedir();
    const [fsSizes, mem, currentLoad, osInfo, workspaceSize] = await Promise.all([
      si.fsSize().catch(() => []),
      si.mem().catch(() => null),
      si.currentLoad().catch(() => null),
      si.osInfo().catch(() => null),
      this.getFolderSize(cwd).catch(() => ({ bytes: 0, partial: false }))
    ]);

    const systemDriveName = process.platform === 'win32' ? 'C:' : path.parse(home).root;
    const systemDrive = (fsSizes as any[]).find(d => String(d.fs || d.mount).toLowerCase().startsWith(systemDriveName.toLowerCase())) || (fsSizes as any[])[0];

    return {
      cwd,
      home,
      os: osInfo ? `${osInfo.distro} ${osInfo.release}` : os.type(),
      hostname: os.hostname(),
      cpu: currentLoad ? Math.round(currentLoad.currentLoad) : 0,
      ram: mem ? {
        total: mem.total,
        used: mem.active,
        percent: Math.round((mem.active / mem.total) * 100)
      } : null,
      systemDrive: systemDrive ? {
        fs: systemDrive.fs || systemDrive.mount || systemDriveName,
        mount: systemDrive.mount,
        size: systemDrive.size,
        used: systemDrive.used,
        available: systemDrive.available,
        percent: Math.round(systemDrive.use || ((systemDrive.used / systemDrive.size) * 100))
      } : null,
      workspace: workspaceSize,
      quickAccess: [
        { label: 'Documents', path: app.getPath('documents') },
        { label: 'Downloads', path: app.getPath('downloads') },
        { label: 'Desktop', path: app.getPath('desktop') },
        { label: 'AI Exports', path: path.join(cwd, 'dist') }
      ]
    };
  }

  async listDirectory(folderPath?: string) {
    const target = path.resolve(folderPath || process.cwd());
    const entries = fs.readdirSync(target, { withFileTypes: true }).slice(0, 200);
    return {
      path: target,
      entries: entries.map(entry => {
        const fullPath = path.join(target, entry.name);
        let size = 0;
        let modifiedAt = '';
        try {
          const stats = fs.statSync(fullPath);
          size = stats.size;
          modifiedAt = stats.mtime.toISOString();
        } catch {
          // Keep unreadable entries visible.
        }
        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'folder' : 'file',
          size,
          modifiedAt
        };
      })
    };
  }

  async revealPath(targetPath: string) {
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) return { ok: false, error: `Path not found: ${resolved}` };
    shell.showItemInFolder(resolved);
    return { ok: true, path: resolved };
  }

  async openPath(targetPath: string) {
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) return { ok: false, error: `Path not found: ${resolved}` };
    const error = await shell.openPath(resolved);
    return error ? { ok: false, error } : { ok: true, path: resolved };
  }

  async openTerminal(folderPath?: string) {
    const cwd = path.resolve(folderPath || process.cwd());
    const child = spawn('powershell.exe', ['-NoExit', '-Command', `Set-Location -LiteralPath '${cwd.replace(/'/g, "''")}'`], {
      cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return { ok: true, path: cwd };
  }

  async createDesktopShortcut() {
    try {
      const home = os.homedir();
      const desktop = path.join(home, 'Desktop');
      const oneDriveDesktop = path.join(home, 'OneDrive', 'Desktop');
      const oneDriveCommercialDesktop = path.join(home, 'OneDrive - CiniForge', 'Desktop');
      
      let desktopPath = desktop;
      if (fs.existsSync(oneDriveCommercialDesktop)) {
        desktopPath = oneDriveCommercialDesktop;
      } else if (fs.existsSync(oneDriveDesktop)) {
        desktopPath = oneDriveDesktop;
      }
      
      const shortcutPath = path.join(desktopPath, 'HermsDesk ME 1.7.lnk');
      const projectPath = process.cwd();
      const targetPath = path.join(projectPath, 'start-aion.bat');
      
      shell.writeShortcutLink(shortcutPath, {
        target: targetPath,
        cwd: projectPath,
        description: 'HermesDesk ME - Your Local AI Workstation',
        icon: path.join(projectPath, 'release', 'win-unpacked', 'hermsdeskapp.exe'),
        iconIndex: 0
      });
      
      return { success: true, path: shortcutPath };
    } catch (error: any) {
      console.error('Failed to create shortcut:', error);
      return { success: false, error: error.message };
    }
  }

  async openExternalApp(appName: string) {
    switch (appName.toLowerCase()) {
      case 'whatsapp':
        return shell.openExternal('whatsapp://');
      case 'whatsapp web':
        return shell.openExternal('https://web.whatsapp.com/');
      case 'google meet':
      case 'video call':
        return shell.openExternal('https://meet.google.com/new');
      case 'teams':
      case 'microsoft teams':
        return shell.openExternal('msteams://');
      case 'voice stack':
      case 'silva voice stack':
        return shell.openExternal('http://localhost:7100/');
      case 'outlook':
      case 'new outlook':
        return shell.openExternal('outlook://');
      case 'classic outlook':
        return new Promise((resolve) => {
          const child = spawn('outlook.exe', [], { detached: true, stdio: 'ignore', windowsHide: false });
          child.on('error', async () => resolve(await shell.openExternal('outlook://')));
          child.unref();
          resolve(true);
        });
      case 'gmail':
        return shell.openExternal('https://mail.google.com');
      case 'terminal':
      case 'powershell':
        return this.openTerminal();
      case 'documents':
        return shell.openPath(app.getPath('documents'));
      case 'downloads':
        return shell.openPath(app.getPath('downloads'));
      case 'desktop':
        return shell.openPath(app.getPath('desktop'));
      default:
        if (/^https?:\/\//i.test(appName)) return shell.openExternal(appName);
        return shell.openPath(appName);
    }
  }

  async openApp(appName: string) {
    return this.openExternalApp(appName);
  }

  async composeWhatsAppMessage(message: string, phone?: string) {
    const text = encodeURIComponent(message || '');
    const cleanedPhone = (phone || '').replace(/[^\d]/g, '');
    const deepLink = cleanedPhone
      ? `whatsapp://send?phone=${cleanedPhone}&text=${text}`
      : `whatsapp://send?text=${text}`;

    try {
      await shell.openExternal(deepLink);
      return { ok: true, url: deepLink, mode: 'desktop' };
    } catch {
      const web = cleanedPhone
        ? `https://wa.me/${cleanedPhone}?text=${text}`
        : `https://web.whatsapp.com/send?text=${text}`;
      await shell.openExternal(web);
      return { ok: true, url: web, mode: 'web' };
    }
  }

  async getVoiceStackStatus() {
    try {
      const [home, voices] = await Promise.all([
        axios.get('http://localhost:7100/', { timeout: 2000 }),
        axios.get('http://localhost:7100/voices', { timeout: 2000 }).catch(() => null)
      ]);
      return { ok: true, url: 'http://localhost:7100/', status: home.status, voices: voices?.data || null };
    } catch (error: any) {
      return { ok: false, url: 'http://localhost:7100/', error: error.message };
    }
  }

  async speakWithVoiceStack(text: string, options: any = {}) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { ok: false, error: 'No text to speak.' };

    const voice = options.voice || 'tamil-jaffna';
    const language = options.language || 'ta-LK';
    const payload = {
      text: cleanText,
      voice,
      language,
      locale: language,
      accent: options.accent || 'jaffna',
      style: options.style || 'professional',
      rate: options.rate || 1,
      pitch: options.pitch || 1,
      format: options.format || 'mp3'
    };

    const endpoints = ['/api/speak', '/speak', '/api/tts', '/tts', '/v1/audio/speech'];
    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(`http://localhost:7100${endpoint}`, payload, {
          timeout: 30000,
          responseType: 'arraybuffer',
          validateStatus: status => status >= 200 && status < 300
        });

        const contentType = String(response.headers?.['content-type'] || '');
        if (contentType.includes('audio') || response.data?.byteLength > 1024) {
          const ext = contentType.includes('wav') ? 'wav' : 'mp3';
          const audioPath = path.join(app.getPath('temp'), `hermes-voice-${Date.now()}.${ext}`);
          fs.writeFileSync(audioPath, Buffer.from(response.data));
          await shell.openPath(audioPath);
          return { ok: true, mode: 'audio-file', endpoint, voice, language, path: audioPath };
        }

        const body = Buffer.from(response.data).toString('utf8');
        let parsed: any = {};
        try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
        return { ok: true, mode: 'voice-stack', endpoint, voice, language, response: parsed };
      } catch (error: any) {
        lastError = error?.response?.data
          ? Buffer.from(error.response.data).toString('utf8').slice(0, 300)
          : error?.message || String(error);
      }
    }

    return {
      ok: false,
      url: 'http://localhost:7100/',
      error: `Silva Voice Stack did not accept known speak endpoints. Last error: ${lastError || 'offline'}`
    };
  }

  async getClassicOutlookStatus() {
    const script = `
$ErrorActionPreference = 'Stop'
$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$accounts = @()
foreach ($account in $ns.Accounts) {
  $accounts += [pscustomobject]@{
    displayName = [string]$account.DisplayName
    smtpAddress = [string]$account.SmtpAddress
  }
}
$inbox = $ns.GetDefaultFolder(6)
[pscustomobject]@{
  ok = $true
  profile = [string]$ns.CurrentProfileName
  inboxName = [string]$inbox.Name
  itemCount = [int]$inbox.Items.Count
  accounts = $accounts
} | ConvertTo-Json -Compress -Depth 4
`;
    try {
      return await this.runPowerShellJson(script);
    } catch (error: any) {
      return { ok: false, error: error.message || 'Classic Outlook is not available.' };
    }
  }

  async listClassicOutlookMessages(limit = 15) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 15, 50));
    const script = `
$ErrorActionPreference = 'Stop'
$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$inbox = $ns.GetDefaultFolder(6)
$items = $inbox.Items
$items.Sort('[ReceivedTime]', $true)
$messages = @()
$seen = 0
for ($i = 1; $i -le $items.Count -and $messages.Count -lt ${safeLimit}; $i++) {
  $item = $items.Item($i)
  if ($null -eq $item) { continue }
  if ([string]$item.MessageClass -notlike 'IPM.Note*') { continue }
  $body = [string]$item.Body
  $body = ($body -replace '\\s+', ' ').Trim()
  if ($body.Length -gt 700) { $body = $body.Substring(0, 700) }
  $messages += [pscustomobject]@{
    id = [string]$item.EntryID
    subject = [string]$item.Subject
    sender = [string]$item.SenderName
    senderEmail = [string]$item.SenderEmailAddress
    receivedAt = $item.ReceivedTime.ToString('o')
    unread = [bool]$item.UnRead
    hasAttachments = [bool]($item.Attachments.Count -gt 0)
    bodyPreview = $body
  }
  $seen++
}
$messages | ConvertTo-Json -Compress -Depth 4
`;
    try {
      const result = await this.runPowerShellJson(script);
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    } catch (error: any) {
      return { ok: false, error: error.message || 'Could not read classic Outlook inbox.' };
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

  async analyzeUKDocument(filePath: string, type: 'legal' | 'tax') {
    return this.analyzeUKProfessionalDocs(filePath, type);
  }
}
