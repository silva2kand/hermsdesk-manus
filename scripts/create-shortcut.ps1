$wshell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptRoot
$launcherPath = Join-Path $projectPath "start-aion.bat"
$oneDriveDesktop = Join-Path $env:USERPROFILE "OneDrive\Desktop"
$desktopTarget = if (Test-Path $oneDriveDesktop) { $oneDriveDesktop } else { $desktop }
$shortcutPath = Join-Path $desktopTarget "HermsDesk.lnk"
$shortcut = $wshell.CreateShortcut($shortcutPath)

$shortcut.TargetPath = $launcherPath
$shortcut.Arguments = ""
$shortcut.WorkingDirectory = $projectPath
$shortcut.Description = "Launch HermsDesk ME agent workstation"
$shortcut.IconLocation = Join-Path $projectPath "release\win-unpacked\hermsdeskapp.exe"
$shortcut.Save()

Write-Host "Shortcut created on Desktop: $shortcutPath" -ForegroundColor Green
