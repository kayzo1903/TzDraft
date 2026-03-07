@echo off
setlocal

REM Build sidra-cli.exe using MSVC (Developer Command Prompt required)
echo Building sidra-cli.exe...
cl /EHsc /O2 sidra-cli.cpp /link /OUT:sidra-cli.exe
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

if not exist "..\\bin" (
  mkdir "..\\bin"
)

copy /Y sidra-cli.exe "..\\bin\\sidra-cli.exe" >nul
echo Done. Output: ..\\bin\\sidra-cli.exe
endlocal
