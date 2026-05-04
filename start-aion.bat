@echo off
setlocal
set "APP_DIR=%~dp0"
set "PACKAGED_EXE=%APP_DIR%release\win-unpacked\hermsdeskapp.exe"

if exist "%PACKAGED_EXE%" (
  start "" "%PACKAGED_EXE%"
  exit /b 0
)

cd /d "%APP_DIR%"
set "ELECTRON_RUN_AS_NODE="
npm run dev
