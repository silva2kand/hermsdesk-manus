import { shell, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import si from 'systeminformation';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execFileAsync = promisify(execFile);
const VOICE_STACK_ROOT = 'C:\\Users\\Silva\\WorkSpace\\voicelcl\\silva-voice';
const VOICE_STACK_LAUNCHER = path.join(VOICE_STACK_ROOT, 'run_server.bat');
const VOICE_STACK_PYTHON = path.join(VOICE_STACK_ROOT, 'venv_311', 'Scripts', 'python.exe');

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

  private async runPowerShellText(script: string, timeout = 60000) {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script
    ], {
      cwd: VOICE_STACK_ROOT,
      timeout,
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true
    });
    return `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim();
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
        await this.startVoiceStackServer();
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

  private async startVoiceStackServer() {
    try {
      await axios.get('http://localhost:7100/', { timeout: 1500 });
      return { ok: true, alreadyRunning: true };
    } catch {
      if (!fs.existsSync(VOICE_STACK_LAUNCHER)) return { ok: false, error: 'Silva Voice Stack launcher was not found.' };
      const child = spawn(VOICE_STACK_LAUNCHER, [], { cwd: VOICE_STACK_ROOT, detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { ok: true, started: true };
    }
  }

  async diagnoseVoiceStack() {
    const rootExists = fs.existsSync(VOICE_STACK_ROOT);
    const pythonExists = fs.existsSync(VOICE_STACK_PYTHON);
    const launcherExists = fs.existsSync(VOICE_STACK_LAUNCHER);
    const missingModels: string[] = [];
    const modelPaths = [
      'models\\kokoro\\en-gb\\m1.pth',
      'models\\kokoro\\en-gb\\f1.pth',
      'models\\kokoro\\en-us\\m1.pth',
      'models\\kokoro\\en-us\\f1.pth',
      'models\\kokoro\\en-in\\m1.pth',
      'models\\kokoro\\en-in\\f1.pth',
      'models\\piper\\ta\\tamil_m1.onnx',
      'models\\xtts-v2\\model.pth'
    ];
    for (const modelPath of modelPaths) {
      if (!fs.existsSync(path.join(VOICE_STACK_ROOT, modelPath))) missingModels.push(modelPath);
    }

    let python = null;
    if (pythonExists) {
      const script = `
& '${VOICE_STACK_PYTHON}' -c "import importlib.util, torch, json; print(json.dumps({'torch': str(torch.__version__), 'cuda': bool(torch.cuda.is_available()), 'tts': importlib.util.find_spec('TTS') is not None, 'piper': importlib.util.find_spec('piper') is not None}))"
`;
      try {
        python = JSON.parse(await this.runPowerShellText(script, 30000));
      } catch (error: any) {
        python = { error: error.message };
      }
    }

    return {
      ok: rootExists && pythonExists && launcherExists && missingModels.length === 0 && Boolean((python as any)?.tts),
      root: VOICE_STACK_ROOT,
      rootExists,
      pythonExists,
      launcherExists,
      python,
      missingModels,
      recommendedAction: missingModels.length
        ? 'Run Build Voice Stack, then add/download the missing Kokoro/Piper voice model files listed here.'
        : 'Run Build Voice Stack to refresh Python packages and restart the server.'
    };
  }

  async buildVoiceStackNeeds() {
    if (!fs.existsSync(VOICE_STACK_ROOT)) {
      return { ok: false, error: `Voice Stack folder not found: ${VOICE_STACK_ROOT}` };
    }

    const repairScript = path.join(VOICE_STACK_ROOT, 'repair_voice_stack.ps1');
    const script = `
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath '${VOICE_STACK_ROOT}'
Write-Host '=== Silva Voice Stack self-build / repair ==='
if (!(Test-Path '.\\venv_311\\Scripts\\python.exe')) {
  Write-Host 'Creating Python 3.11 virtual environment...'
  py -3.11 -m venv .\\venv_311
}
$py = '.\\venv_311\\Scripts\\python.exe'
& $py -m pip install --upgrade pip setuptools wheel
& $py -m pip install -e .
& $py -m pip install piper-tts
Write-Host 'Trying CUDA PyTorch install for RTX GPU. If this fails, existing CPU torch remains.'
& $py -m pip install --upgrade torch torchaudio --index-url https://download.pytorch.org/whl/cu121
Write-Host ''
Write-Host 'Checking runtime...'
& $py -c "import importlib.util, torch, json; print(json.dumps({'torch': str(torch.__version__), 'cuda': bool(torch.cuda.is_available()), 'tts': importlib.util.find_spec('TTS') is not None, 'piper': importlib.util.find_spec('piper') is not None}, indent=2))"
Write-Host ''
Write-Host 'Model files still required for premium advertised voices:'
@(
  'models\\kokoro\\en-gb\\m1.pth',
  'models\\kokoro\\en-gb\\f1.pth',
  'models\\kokoro\\en-us\\m1.pth',
  'models\\kokoro\\en-us\\f1.pth',
  'models\\kokoro\\en-in\\m1.pth',
  'models\\kokoro\\en-in\\f1.pth',
  'models\\piper\\ta\\tamil_m1.onnx'
) | ForEach-Object {
  if (Test-Path $_) { Write-Host "OK    $_" } else { Write-Host "MISS  $_" }
}
Write-Host ''
Write-Host 'Restarting Silva Voice Stack...'
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'silva_voice.server' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath '.\\run_server.bat' -WorkingDirectory '${VOICE_STACK_ROOT}' -WindowStyle Hidden
Write-Host 'Repair script finished. Close this window after checking any MISS lines above.'
Pause
`;
    fs.writeFileSync(repairScript, script, 'utf8');
    const child = spawn('powershell.exe', ['-NoExit', '-ExecutionPolicy', 'Bypass', '-File', repairScript], {
      cwd: VOICE_STACK_ROOT,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return {
      ok: true,
      mode: 'visible-repair-terminal',
      script: repairScript,
      message: 'Opened Silva Voice Stack self-build terminal. It installs/repairs Python packages, checks GPU/Piper/TTS, lists missing models, and restarts the server.'
    };
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
      await this.startVoiceStackServer();
      const [home, profiles, accents] = await Promise.all([
        axios.get('http://localhost:7100/', { timeout: 2000 }),
        axios.get('http://localhost:7100/tts/profiles', { timeout: 2000 }).catch(() => null),
        axios.get('http://localhost:7100/tts/accents', { timeout: 2000 }).catch(() => null)
      ]);
      return { ok: true, url: 'http://localhost:7100/', status: home.status, profiles: profiles?.data || null, accents: accents?.data || null };
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
      accent_id: options.accent_id || options.accentId || voice,
      style: options.style || 'professional',
      rate: options.rate || 1,
      pitch: options.pitch || 1,
      format: options.format || 'mp3'
    };

    const endpoints = ['/tts/synthesize', '/api/speak', '/speak', '/api/tts', '/tts', '/v1/audio/speech'];
    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(`http://localhost:7100${endpoint}`, payload, {
          timeout: 300000,
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
