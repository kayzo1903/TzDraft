@echo off
setlocal

REM Build kallisto-sidecar.exe using MSVC (Developer Command Prompt required)
REM Must be run from a 32-bit MSVC Developer Command Prompt or use vcvars32.bat
REM The Kallisto_4.dll is 32-bit, so the sidecar must also be 32-bit.

echo ============================================
echo  Building kallisto-sidecar.exe (32-bit)
echo ============================================

REM Try to compile (32-bit required for DLL compatibility)
cl /EHsc /O2 /arch:IA32 kallisto-sidecar.cpp /link /OUT:kallisto-sidecar.exe
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  echo Make sure you are running from a 32-bit MSVC Developer Command Prompt.
  echo Example: "Developer Command Prompt for VS 2022" then run:
  echo   vcvars32.bat
  echo   cd /d "%~dp0"
  echo   build_kallisto.bat
  exit /b 1
)

REM Create bin directory if it does not exist
if not exist "bin" mkdir "bin"

REM Copy sidecar and Kallisto_4.dll to bin/
copy /Y kallisto-sidecar.exe "bin\kallisto-sidecar.exe" >nul
echo Copied: bin\kallisto-sidecar.exe

REM Copy Kallisto_4.dll from docs/kallisto if not already in bin/
if not exist "bin\Kallisto_4.dll" (
  if exist "..\..\docs\kallisto\Kallisto_4.dll" (
    copy /Y "..\..\docs\kallisto\Kallisto_4.dll" "bin\Kallisto_4.dll" >nul
    echo Copied: bin\Kallisto_4.dll  ^(from docs/kallisto^)
  ) else (
    echo [WARN] Kallisto_4.dll not found. Copy it manually to engines\kallisto\bin\
  )
)

echo.
echo Done. Output: engines\kallisto\bin\kallisto-sidecar.exe
echo.
echo NEXT STEPS:
echo   1. Ensure Kallisto_4.dll is in engines\kallisto\bin\
echo   2. Optionally place Kallisto.bk ^(opening book^) at:
echo      engines\kallisto\Engines\Kallisto.bk
echo   3. Set KALLISTO_CLI_PATH env var in backend if using non-default location
endlocal
