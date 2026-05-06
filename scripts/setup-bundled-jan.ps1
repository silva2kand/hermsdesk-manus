$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Runtime = Join-Path $Root 'bin\jan-runtime'
$AppDir = Join-Path $Runtime 'app'

New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

Write-Host 'Fetching latest official Jan Windows release metadata...'
$Release = Invoke-RestMethod -Uri 'https://api.github.com/repos/janhq/jan/releases/latest' -Headers @{ 'User-Agent'='HermsDeskRuntimeSetup' } -TimeoutSec 30
$Asset = $Release.assets | Where-Object { $_.name -match 'x64-setup\.exe$' } | Select-Object -First 1
if (-not $Asset) {
  throw 'No Jan Windows x64 setup asset was found in the latest official Jan release.'
}

$Installer = Join-Path $Runtime $Asset.name
if (!(Test-Path $Installer)) {
  Write-Host "Downloading $($Asset.name)..."
  Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $Installer -UseBasicParsing -TimeoutSec 900
} else {
  Write-Host "Using existing installer: $Installer"
}

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
Write-Host "Installing Jan runtime into HermsDesk app folder: $AppDir"
$Process = Start-Process -FilePath $Installer -ArgumentList @('/S', "/D=$AppDir") -Wait -PassThru -WindowStyle Hidden
if ($Process.ExitCode -ne 0) {
  throw "Jan installer failed with exit code $($Process.ExitCode)."
}

$JanExe = Join-Path $AppDir 'Jan.exe'
if (!(Test-Path $JanExe)) {
  throw "Jan.exe was not found after install: $JanExe"
}

Write-Host 'Bundled Jan runtime ready:'
Get-ChildItem -Path $AppDir -Recurse -File -Include 'Jan.exe','jan-cli.exe','nitro.exe' |
  Select-Object FullName,Length |
  Format-Table -AutoSize

