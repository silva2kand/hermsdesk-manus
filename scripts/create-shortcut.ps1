$wshell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$projectPath = "c:\Users\Silva\WorkSpace\hermsdeskapp"
$shortcutPath = Join-Path $desktop "HermsDesk.lnk"
$shortcut = $wshell.CreateShortcut($shortcutPath)

# We want to launch the dev server in the project directory
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoExit -Command ""cd '$projectPath'; npm run dev"""
$shortcut.WorkingDirectory = $projectPath
$shortcut.Description = "Launch HermsDesk Workstation"
$shortcut.IconLocation = "powershell.exe, 0"
$shortcut.Save()

Write-Host "Shortcut created on Desktop: $shortcutPath" -ForegroundColor Green
