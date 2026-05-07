$sh = New-Object -ComObject WScript.Shell
$shortcuts = @(
    "C:\Users\Silva\OneDrive\Desktop\HermsDesk ME 1.7.lnk",
    "C:\Users\Silva\OneDrive\Desktop\Silva Voice Stack.lnk",
    "C:\Users\Silva\OneDrive\Desktop\HermesDesk ME.lnk"
)

foreach ($path in $shortcuts) {
    if (Test-Path $path) {
        $s = $sh.CreateShortcut($path)
        Write-Host "Shortcut: $path"
        Write-Host "Target: $($s.TargetPath)"
        Write-Host "Arguments: $($s.Arguments)"
        Write-Host "CWD: $($s.WorkingDirectory)"
        Write-Host "---"
    } else {
        Write-Host "Not found: $path"
    }
}
