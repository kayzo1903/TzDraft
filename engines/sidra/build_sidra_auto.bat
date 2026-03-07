@echo off
setlocal

echo Checking for MSVC Compiler...

REM 1. Check if cl.exe is already in PATH
where cl >nul 2>nul
if %errorlevel% equ 0 (
    echo MSVC Compiler found in PATH.
    goto :build
)

echo MSVC not in PATH. Attempting to locate vcvars64.bat...

REM 2. Common Locations for vcvars64.bat
set "VCVARS="
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

if defined VCVARS (
    echo Found vcvars64.bat at: "%VCVARS%"
    call "%VCVARS%"
) else (
    echo Error: Could not find Visual Studio 2022 or 2019 Build Tools.
    echo Please open "Developer Command Prompt for VS 2022" manually.
    exit /b 1
)

REM 3. Verify cl.exe again (Double check)
where cl >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Environment initialized but 'cl.exe' still not found.
    exit /b 1
)

:build
echo.
echo Building SiDra DLL...
if not exist "bin" mkdir bin

cl /LD /Fe:bin\SiDra.dll /O2 /D_WINDOWS /D_USRDLL /D_WINDLL *.cpp /link user32.lib /EXPORT:EI_Initialization /EXPORT:EI_NewGame /EXPORT:EI_SetupBoard /EXPORT:EI_SetTimeControl /EXPORT:EI_SetTime /EXPORT:EI_Think

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)


echo.
echo Building SiDra CLI...
cl /Fe:bin\sidra-cli.exe /O2 /D_WINDOWS /EHsc cli\sidra-cli.cpp /link user32.lib

if %errorlevel% neq 0 (
    echo CLI Build failed!
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   Build SUCCESS! 
echo   DLL: engines\sidra\bin\SiDra.dll
echo   CLI: engines\sidra\bin\sidra-cli.exe
echo ===================================================
endlocal
exit /b 0
