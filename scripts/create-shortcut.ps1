$wshell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptRoot
$launcherPath = Join-Path $projectPath "start-aion.bat"
$shortcutPath = Join-Path $desktop "Aion OS (Start).lnk"
$shortcut = $wshell.CreateShortcut($shortcutPath)

# Launch the packaged app when it exists, otherwise fall back to dev mode.
$shortcut.TargetPath = $launcherPath
$shortcut.Arguments = ""
$shortcut.WorkingDirectory = $projectPath
$shortcut.Description = "Launch Aion OS Workstation"
$shortcut.IconLocation = Join-Path $projectPath "release\win-unpacked\hermsdeskapp.exe"
$shortcut.Save()

Write-Host "Shortcut created on Desktop: $shortcutPath" -ForegroundColor Green
