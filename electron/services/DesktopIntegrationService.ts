import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import si from 'systeminformation';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const require = createRequire(import.meta.url);
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron');
const { shell, dialog, app } = electron;

const execFileAsync = promisify(execFile);

// Virtualize paths - move from hardcoded C:\Users\Silva to dynamic locations
const VOICE_STACK_ROOT = fs.existsSync('C:\\Users\\Silva\\WorkSpace\\voicelcl\\silva-voice') 
  ? 'C:\\Users\\Silva\\WorkSpace\\voicelcl\\silva-voice'
  : path.join(process.cwd(), 'bin', 'silva-voice');
const VOICE_STACK_LAUNCHER = path.join(VOICE_STACK_ROOT, 'run_server.bat');
const VOICE_STACK_MODELS = path.join(VOICE_STACK_ROOT, 'models');
const VOICE_STACK_PYTHON = path.join(VOICE_STACK_ROOT, 'venv_311', 'Scripts', 'python.exe');

export class DesktopIntegrationService {
  private async runPowerShellJson(script: string, timeout = 30000, maxBufferMb = 5) {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script
    ], {
      timeout,
      maxBuffer: 1024 * 1024 * maxBufferMb,
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

  private psString(value: string) {
    return `'${String(value).replace(/'/g, "''")}'`;
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
    const gpuProbe = async () => {
      if (process.platform !== 'win32') return null;
      try {
        const { stdout } = await execFileAsync('nvidia-smi', [
          '--query-gpu=name,utilization.gpu,memory.total,memory.used',
          '--format=csv,noheader,nounits'
        ], { timeout: 4000, windowsHide: true });
        const first = stdout.trim().split(/\r?\n/)[0];
        if (!first) return null;
        const [name, utilization, memoryTotal, memoryUsed] = first.split(',').map(part => part.trim());
        return {
          name,
          utilization: Number(utilization) || 0,
          memoryTotalMb: Number(memoryTotal) || 0,
          memoryUsedMb: Number(memoryUsed) || 0
        };
      } catch {
        return null;
      }
    };
    const [fsSizes, mem, currentLoad, osInfo, workspaceSize, gpu] = await Promise.all([
      si.fsSize().catch(() => []),
      si.mem().catch(() => null),
      si.currentLoad().catch(() => null),
      si.osInfo().catch(() => null),
      this.getFolderSize(cwd).catch(() => ({ bytes: 0, partial: false })),
      gpuProbe()
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
      gpu,
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
      
      // Generalize OneDrive detection to work on any machine
      let desktopPath = desktop;
      const scanOneDrive = (base: string) => {
        if (!fs.existsSync(base)) return null;
        const entries = fs.readdirSync(base, { withFileTypes: true });
        // Check for OneDrive or OneDrive - Company
        const odDir = entries.find(e => e.isDirectory() && (e.name === 'OneDrive' || e.name.startsWith('OneDrive - ')));
        if (odDir) {
          const odDesktop = path.join(base, odDir.name, 'Desktop');
          if (fs.existsSync(odDesktop)) return odDesktop;
        }
        return null;
      };

      desktopPath = scanOneDrive(home) || desktop;
      
      const shortcutPath = path.join(desktopPath, 'HermsDesk ME.lnk');
      const projectPath = process.cwd();
      let targetPath = path.join(projectPath, 'start-aion.bat');
      if (!fs.existsSync(targetPath)) {
        targetPath = path.join(projectPath, 'release', 'win-unpacked', 'hermsdeskapp.exe');
      }
      
      shell.writeShortcutLink(shortcutPath, {
        target: targetPath,
        cwd: projectPath,
        description: 'HermesDesk ME - Your Local AI Workstation',
        icon: targetPath.endsWith('.exe') ? targetPath : path.join(projectPath, 'electron-vite.svg'),
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
      await axios.get('http://localhost:7100/', { timeout: 700, validateStatus: status => status >= 200 && status < 500 });
      return { ok: true, alreadyRunning: true };
    } catch {
      // Ensure folder and server files exist
      await this.buildVoiceStackFilesOnly();

      if (!fs.existsSync(VOICE_STACK_LAUNCHER)) return { ok: false, error: 'Silva Voice Stack launcher was not found.' };
      
      const child = spawn(VOICE_STACK_LAUNCHER, [], { cwd: VOICE_STACK_ROOT, detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await axios.get('http://localhost:7100/', { timeout: 1500, validateStatus: status => status >= 200 && status < 500 });
          return { ok: true, started: true };
        } catch {
          // Voice models can take a moment to initialize.
        }
      }
      return { ok: true, started: true, warmingUp: true };
    }
  }

  async diagnoseVoiceStack() {
    const rootExists = fs.existsSync(VOICE_STACK_ROOT);
    const pythonExists = fs.existsSync(VOICE_STACK_PYTHON);
    const launcherExists = fs.existsSync(VOICE_STACK_LAUNCHER);
    const missingOptionalModels: string[] = [];
    const optionalModelPaths = [
      'models\\kokoro\\en-gb\\m1.pth',
      'models\\kokoro\\en-gb\\f1.pth',
      'models\\kokoro\\en-us\\m1.pth',
      'models\\kokoro\\en-us\\f1.pth',
      'models\\kokoro\\en-in\\m1.pth',
      'models\\kokoro\\en-in\\f1.pth',
      'models\\piper\\ta\\tamil_m1.onnx'
    ];
    for (const modelPath of optionalModelPaths) {
      if (!fs.existsSync(path.join(VOICE_STACK_ROOT, modelPath))) missingOptionalModels.push(modelPath);
    }
    const xttsModel = fs.existsSync(path.join(VOICE_STACK_ROOT, 'models\\xtts-v2\\model.pth'));
    const openVoiceConverter = fs.existsSync(path.join(VOICE_STACK_ROOT, 'models\\openvoice\\converter\\checkpoint.pth'));
    const accentPresets = fs.existsSync(path.join(VOICE_STACK_ROOT, 'silva_voice\\profiles\\accent_presets.json'));
    const premiumStackReady = xttsModel && openVoiceConverter && accentPresets;

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
      ok: rootExists && pythonExists && launcherExists && premiumStackReady,
      root: VOICE_STACK_ROOT,
      rootExists,
      pythonExists,
      launcherExists,
      python,
      premiumStackReady,
      xttsModel,
      openVoiceConverter,
      accentPresets,
      missingOptionalModels,
      fallback: 'Windows SAPI speech fallback is available only if the premium Silva Voice Stack endpoint fails.',
      recommendedAction: premiumStackReady
        ? 'Premium XTTS/OpenVoice stack detected. Start Voice Stack and use Tamil Jaffna, Tamil India, English UK, or English US presets.'
        : 'Run Build Voice Stack to repair packages, then add/download missing premium model files.'
    };
  }

  async buildVoiceStackNeeds() {
    await this.buildVoiceStackFilesOnly();
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

  private async buildVoiceStackFilesOnly() {
    if (!fs.existsSync(VOICE_STACK_ROOT)) fs.mkdirSync(VOICE_STACK_ROOT, { recursive: true });
    const packageFile = path.join(VOICE_STACK_ROOT, 'pyproject.toml');
    const serverDir = path.join(VOICE_STACK_ROOT, 'silva_voice');
    const serverFile = path.join(serverDir, 'server.py');

    if (!fs.existsSync(packageFile)) {
      fs.writeFileSync(packageFile, `[project]
name = "silva-voice"
version = "0.1.0"
dependencies = ["fastapi", "uvicorn", "pyttsx3"]

[tool.setuptools.packages.find]
where = ["."]
include = ["silva_voice*"]
`, 'utf8');
    }

    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
    const initFile = path.join(serverDir, '__init__.py');
    if (!fs.existsSync(initFile)) fs.writeFileSync(initFile, '', 'utf8');
    
    if (!fs.existsSync(serverFile)) {
      // Only write default if it doesn't exist
      fs.writeFileSync(serverFile, `from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import pyttsx3
import os
import time
import subprocess
import json

app = FastAPI(title="Silva Voice Stack")

class SpeakRequest(BaseModel):
    text: str
    voice: str | None = None
    language: str | None = None
    accent: str | None = None
    rate: float | None = 1

@app.get("/")
def home():
    return {"ok": True, "mode": "windows-sapi-fallback", "status": "online", "service": "Silva Voice Engine", "endpoints": ["/tts/synthesize", "/tts/stream", "/tts/profiles", "/tts/accents"]}

@app.get("/tts/profiles")
@app.get("/api/tts/profiles")
def profiles():
    return {"profiles": ["tamil-jaffna", "tamil-india", "english-uk", "english-us"], "fallback": "Windows installed voices"}

@app.post("/tts/synthesize")
@app.post("/api/speak")
@app.post("/speak")
@app.post("/api/tts")
@app.post("/tts")
@app.post("/v1/audio/speech")
async def speak(payload: SpeakRequest):
    text = payload.text
    voice = payload.voice or "tamil-jaffna"
    
    # Try Piper for Tamil if model exists
    piper_exe = os.path.join(os.getcwd(), "venv_311", "Scripts", "piper.exe")
    if not os.path.exists(piper_exe):
        piper_exe = "piper" # Try path
        
    tamil_model = os.path.join(os.getcwd(), "models", "piper", "ta", "tamil_m1.onnx")
    
    if "tamil" in voice.lower() and os.path.exists(tamil_model):
        try:
            output_file = os.path.join(os.environ.get("TEMP", "."), f"silva_voice_{int(time.time())}.wav")
            # piper -m model.onnx -f output.wav
            process = subprocess.Popen([piper_exe, "-m", tamil_model, "-f", output_file], stdin=subprocess.PIPE)
            process.communicate(input=text.encode('utf-8'))
            if os.path.exists(output_file):
                return FileResponse(output_file, media_type="audio/wav")
        except Exception as e:
            print(f"Piper failed: {e}")

    # Fallback to pyttsx3 (SAPI5)
    try:
        engine = pyttsx3.init()
        if payload.rate:
            engine.setProperty("rate", int(175 * float(payload.rate)))
        engine.say(text)
        engine.runAndWait()
        return JSONResponse({"ok": True, "mode": "windows-sapi-fallback", "voice": voice, "language": payload.language})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)
`, 'utf8');
    }

    if (!fs.existsSync(VOICE_STACK_LAUNCHER)) {
      fs.writeFileSync(VOICE_STACK_LAUNCHER, `@echo off
cd /d "%~dp0"
if not exist "venv_311\\Scripts\\python.exe" py -3.11 -m venv venv_311
"venv_311\\Scripts\\python.exe" -m pip install --upgrade pip setuptools wheel
"venv_311\\Scripts\\python.exe" -m pip install -e .
"venv_311\\Scripts\\python.exe" -m uvicorn silva_voice.server:app --host 127.0.0.1 --port 7100
`, 'utf8');
    }
  }

  async composeWhatsAppMessage(message: string, phone?: string) {
    const text = encodeURIComponent(message || '');
    const cleanedPhone = (phone || '').replace(/[^\d]/g, '');
    const deepLink = cleanedPhone
      ? `whatsapp://send?phone=${cleanedPhone}&text=${text}`
      : `whatsapp://send?text=${text}`;
    const web = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${text}`
      : `https://web.whatsapp.com/send?text=${text}`;

    const opened: string[] = [];
    try {
      await shell.openExternal(deepLink);
      opened.push('desktop');
    } catch {
      // Desktop link failed; Web is still a real local browser route.
    }
    try {
      await shell.openExternal(web);
      opened.push('web');
    } catch (error: any) {
      if (!opened.length) return { ok: false, url: web, mode: 'failed', error: error?.message || 'Could not open WhatsApp Desktop or Web.' };
    }
    return { ok: true, url: opened.includes('desktop') ? deepLink : web, webUrl: web, mode: opened.join('+') };
  }

  async getVoiceStackStatus() {
    try {
      await this.startVoiceStackServer();
      const [home, profiles, accents] = await Promise.all([
        axios.get('http://localhost:7100/', { timeout: 900, validateStatus: status => status >= 200 && status < 500 }),
        axios.get('http://localhost:7100/tts/profiles', { timeout: 900, validateStatus: status => status >= 200 && status < 500 }).catch(() => null),
        axios.get('http://localhost:7100/tts/accents', { timeout: 900, validateStatus: status => status >= 200 && status < 500 }).catch(() => null)
      ]);
      return { ok: true, ready: true, url: 'http://localhost:7100/', status: home.status, profiles: profiles?.data || null, accents: accents?.data || null };
    } catch (error: any) {
      return { ok: false, url: 'http://localhost:7100/', error: error.message };
    }
  }

  private speakWithWindowsSapiDetached(cleanText: string) {
    if (process.platform !== 'win32') return false;
    const escaped = cleanText.replace(/'/g, "''");
    const script = `
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.Rate = 0
$speaker.Volume = 100
$speaker.Speak('${escaped}')
`;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return true;
  }

  async speakWithVoiceStack(text: string, options: any = {}) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { ok: false, error: 'No text to speak.' };

    const voice = options.voice || 'en-gb-default';
    const language = options.language || 'en';
    // Map user-friendly voice names to valid accent_id values the server recognizes
    const accentMap: Record<string, string> = {
      'tamil-jaffna': 'ta-default', 'tamil': 'ta-default', 'ta': 'ta-default',
      'english-uk': 'en-gb-default', 'en-gb': 'en-gb-default',
      'english-us': 'en-us-default', 'en-us': 'en-us-default',
      'english-india': 'en-in-default', 'en-in': 'en-in-default',
      'english-us-sapi': 'en-us-sapi',
    };
    const rawAccentId = options.accent_id || options.accentId || voice;
    const accent_id = accentMap[rawAccentId] || rawAccentId;
    const payload = {
      text: cleanText,
      accent_id,
    };

    const endpoints = ['/tts/synthesize', '/api/speak', '/speak', '/api/tts', '/tts', '/v1/audio/speech'];
    let lastError = '';

    await this.startVoiceStackServer().catch(() => null);

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
          const buffer = Buffer.from(response.data);
          
          if (buffer.length < 100) {
            throw new Error(`Voice server returned empty audio (${buffer.length} bytes). Check model files.`);
          }
          
          fs.writeFileSync(audioPath, buffer);
          // Use direct powershell playback for more reliability without opening a player window
          const psPlay = `$p = New-Object System.Media.SoundPlayer("${audioPath.replace(/\\/g, '\\\\')}"); $p.PlaySync()`;
          this.runPowerShellText(psPlay).catch(e => console.error('Direct audio playback failed:', e));
          
          return { ok: true, mode: 'silva-premium-audio-file', endpoint, voice, language, path: audioPath, size: buffer.length };
        }

        const body = Buffer.from(response.data).toString('utf8');
        let parsed: any = {};
        try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
        return { ok: true, mode: 'silva-premium-voice-stack', endpoint, voice, language, response: parsed };
      } catch (error: any) {
        if (error?.code === 'ECONNABORTED') {
          return { ok: true, mode: 'silva-voice-stack-queued', endpoint, voice, language };
        }
        lastError = error?.response?.data
          ? Buffer.from(error.response.data).toString('utf8').slice(0, 300)
          : error?.message || String(error);
      }
    }

    if (this.speakWithWindowsSapiDetached(cleanText)) {
      return { ok: true, mode: 'windows-sapi-queued', voice, language };
    }

    return {
      ok: false,
      url: 'http://localhost:7100/',
      error: `Silva Voice Stack did not accept known speak endpoints and Windows speech fallback failed. Last error: ${lastError || 'offline'}`
    };
  }

  async getClassicOutlookStatus() {
    const script = `
$ErrorActionPreference = 'Stop'
$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$accounts = @()
$totalCount = 0
function Get-MailCount($folder) {
  $c = 0
  try {
    if ($folder.DefaultItemType -eq 0) { $c += $folder.Items.Count }
    foreach ($sub in $folder.Folders) { $c += Get-MailCount $sub }
  } catch {}
  return $c
}
foreach ($root in $ns.Folders) {
  $c = Get-MailCount $root
  $accounts += [pscustomobject]@{
    displayName = [string]$root.Name
    smtpAddress = ""
    itemCount = $c
  }
  $totalCount += $c
}
[pscustomobject]@{
  ok = $true
  profile = [string]$ns.CurrentProfileName
  itemCount = $totalCount
  accounts = $accounts
} | ConvertTo-Json -Compress -Depth 4
`;
    try {
      return await this.runPowerShellJson(script, 300000); // 5 min timeout
    } catch (error: any) {
      return { ok: false, error: error.message || 'Classic Outlook is not available.' };
    }
  }

  async listClassicOutlookMessages(limit = 100, since?: string) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 5000));
    const dateFilter = since ? `[ReceivedTime] > '${new Date(since).toLocaleString('en-GB')}'` : '';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermsdesk-outlook-list-'));
    const outputPath = path.join(tempDir, 'messages.json');
    
    const script = `
$ErrorActionPreference = 'Stop'
$outputPath = ${this.psString(outputPath)}
$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$messages = @()
$folders = New-Object System.Collections.ArrayList
function Add-Folders($folder) {
  try {
    // ONLY scan folders named 'Inbox' for the automatic/quick pass
    if ($folder.Name -ne 'Inbox') { 
       foreach ($child in $folder.Folders) { Add-Folders $child }
       return 
    }
    if ($folder.DefaultItemType -eq 0) { [void]$folders.Add($folder) }
  } catch {}
}
foreach ($root in $ns.Folders) { Add-Folders $root }

foreach ($folder in $folders) {
  try {
    $items = $folder.Items
    if ($items.Count -eq 0) { continue }
    if ('${dateFilter}') { $items = $items.Restrict("${dateFilter}") }
    $items.Sort('[ReceivedTime]', $true)
    
    $folderRead = 0
    $maxItemsPerFolder = if ($folders.Count -gt 20) { 30 } else { 100 }
    
    for ($i = 1; $i -le $items.Count -and $folderRead -lt $maxItemsPerFolder; $i++) {
      $item = $items.Item($i)
      if ($null -eq $item -or [string]$item.MessageClass -notlike 'IPM.Note*') { continue }
      
      $body = [string]$item.Body
      if ($body.Length -gt 500) { $body = $body.Substring(0, 500) }
      $body = ($body -replace '\\s+', ' ').Trim()
      
      $path = [string]$folder.FolderPath
      $accountName = "Unknown"
      try { $accountName = $folder.Store.DisplayName } catch {
         $parts = [regex]::Split($path, '\\\\') | Where-Object { $_ -ne '' }
         if ($parts.Length -gt 0) { $accountName = $parts[0] }
      }

      $messages += [pscustomobject]@{
        id = [string]$item.EntryID
        accountId = "classic-$accountName"
        folderName = $path
        subject = [string]$item.Subject
        sender = [string]$item.SenderName
        senderEmail = [string]$item.SenderEmailAddress
        receivedAt = $item.ReceivedTime.ToString('o')
        unread = [bool]$item.UnRead
        hasAttachments = [bool]($item.Attachments.Count -gt 0)
        bodyPreview = $body
      }
      $folderRead++
    }
  } catch { continue }
}
$payload = @($messages |
  Sort-Object {[datetime]$_.receivedAt} -Descending |
  Select-Object -First ${safeLimit})
$payload | ConvertTo-Json -Compress -Depth 4 | Set-Content -LiteralPath $outputPath -Encoding UTF8
`;
    try {
      await this.runPowerShellText(script, 300000); // 5 min timeout
      const raw = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8').trim() : '';
      const result = raw ? JSON.parse(raw) : [];
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    } catch (error: any) {
      return { ok: false, error: error.message || 'Could not read classic Outlook inbox.' };
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  }

  async syncClassicOutlookMessagesBatch(options: { batchSize?: number; reset?: boolean; state?: any } = {}) {
    const safeLimit = Math.max(25, Math.min(Number(options.batchSize) || 500, 1000));
    const incomingState = options.reset ? { folderCursors: {}, folderCompleted: {}, totalIndexed: 0 } : (options.state || {});
    const statePayload = {
      folderCursors: incomingState.folderCursors || {},
      folderCompleted: incomingState.folderCompleted || {}
    };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermsdesk-outlook-'));
    const statePath = path.join(tempDir, 'state.json');
    const outputPath = path.join(tempDir, 'batch.json');
    fs.writeFileSync(statePath, JSON.stringify(statePayload), 'utf8');

    const script = `
$ErrorActionPreference = 'Stop'
$statePath = ${this.psString(statePath)}
$outputPath = ${this.psString(outputPath)}
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$folderCursors = @{}
$folderCompleted = @{}
if ($state.folderCursors) {
  foreach ($p in $state.folderCursors.PSObject.Properties) { $folderCursors[$p.Name] = [int]$p.Value }
}
if ($state.folderCompleted) {
  foreach ($p in $state.folderCompleted.PSObject.Properties) { $folderCompleted[$p.Name] = [bool]$p.Value }
}
$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$messages = @()
$folders = New-Object System.Collections.ArrayList
function Add-Folders($folder) {
  try {
    if ($folder.DefaultItemType -eq 0) { [void]$folders.Add($folder) }
    foreach ($child in $folder.Folders) { Add-Folders $child }
  } catch {}
}
foreach ($root in $ns.Folders) { Add-Folders $root }

foreach ($folder in $folders) {
  if ($messages.Count -ge ${safeLimit}) { break }
  try {
    $path = [string]$folder.FolderPath
    if ($folderCompleted[$path]) { continue }
    $items = $folder.Items
    $items.Sort('[ReceivedTime]', $true)
    $start = 1
    if ($folderCursors.ContainsKey($path) -and $folderCursors[$path] -gt 0) { $start = [int]$folderCursors[$path] }
    $i = $start
    while ($i -le $items.Count -and $messages.Count -lt ${safeLimit}) {
      $item = $items.Item($i)
      $i++
      if ($null -eq $item) { continue }
      if ([string]$item.MessageClass -notlike 'IPM.Note*') { continue }
      $body = [string]$item.Body
      $body = ($body -replace '\\s+', ' ').Trim()
      if ($body.Length -gt 700) { $body = $body.Substring(0, 700) }
      $parts = [regex]::Split($path, '\\\\') | Where-Object { $_ -ne '' }
      $account = if ($parts.Length -gt 0) { $parts[0] } else { $ns.CurrentProfileName }
      $messages += [pscustomobject]@{
        id = [string]$item.EntryID
        accountId = "classic-$account"
        folderId = "classic:$path"
        folderName = $path
        subject = [string]$item.Subject
        sender = [string]$item.SenderName
        senderEmail = [string]$item.SenderEmailAddress
        receivedAt = $item.ReceivedTime.ToString('o')
        unread = [bool]$item.UnRead
        hasAttachments = [bool]($item.Attachments.Count -gt 0)
        bodyPreview = $body
        categoryId = 'classic-outlook'
        categoryLabel = 'Classic Outlook'
        agentId = 'paperclip-full'
        approvalStatus = 'pending-review'
      }
    }
    $folderCursors[$path] = $i
    if ($i -gt $items.Count) { $folderCompleted[$path] = $true }
  } catch {
    continue
  }
}

$cursorObj = [ordered]@{}
foreach ($k in $folderCursors.Keys) { $cursorObj[$k] = $folderCursors[$k] }
$completedObj = [ordered]@{}
foreach ($k in $folderCompleted.Keys) { $completedObj[$k] = $folderCompleted[$k] }
$allComplete = $true
foreach ($folder in $folders) {
  $path = [string]$folder.FolderPath
  if (-not $folderCompleted[$path]) { $allComplete = $false; break }
}
$payload = [pscustomobject]@{
  ok = $true
  messages = @($messages | Sort-Object {[datetime]$_.receivedAt} -Descending)
  state = [pscustomobject]@{
    folderCursors = $cursorObj
    folderCompleted = $completedObj
    totalFolders = $folders.Count
    complete = $allComplete
    lastBatchCount = $messages.Count
    updatedAt = (Get-Date).ToString('o')
  }
}
$payload | ConvertTo-Json -Compress -Depth 6 | Set-Content -LiteralPath $outputPath -Encoding UTF8
`;
    try {
      await this.runPowerShellText(script, 300000);
      const raw = fs.readFileSync(outputPath, 'utf8').trim();
      return JSON.parse(raw);
    } catch (error: any) {
      return { ok: false, error: error.message || 'Could not page Classic Outlook mailbox.' };
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
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
    
    // Enhanced analysis with regex for UK patterns
    const vatPattern = /GB\s?\d{9}|\b\d{9}\s?GB\b/i;
    const sectionPattern = /Section\s(21|8|13|14|47|48)\b/i;
    const courtPattern = /\b(County Court|Tribunal|High Court|HMCTS)\b/i;
    const moneyPattern = /(?:£|\$|EUR)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i;
    
    const findings = {
      hasVAT: vatPattern.test(content),
      hasLegalSection: sectionPattern.test(content),
      isCourtDocument: courtPattern.test(content),
      mentionsMoney: moneyPattern.test(content)
    };

    return {
      type,
      fileName: path.basename(filePath),
      filePath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      findings,
      status: 'Ready for approved AI review'
    };
  }

  async analyzeUKDocument(filePath: string, type: 'legal' | 'tax') {
    return this.analyzeUKProfessionalDocs(filePath, type);
  }
}
