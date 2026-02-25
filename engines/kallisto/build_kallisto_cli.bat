@echo off
:: build_kallisto_cli.bat
:: Compiles kallisto-cli.exe as 32-bit (x86) to match Kallisto_4.dll (32-bit DLL).
:: Requires MSVC (Visual Studio) or MinGW (g++) on PATH, or auto-detects vcvarsall.

cd /d "%~dp0"

echo [build] Compiling kallisto-cli.cpp (x86) ...

:: ── Try MSVC via auto-detected vcvarsall (most reliable) ─────────────────
set VCVARS=
for /f "delims=" %%i in ('where vcvarsall.bat 2^>nul') do set VCVARS=%%i
if "%VCVARS%"=="" (
    for %%d in (
        "C:\Program Files\Microsoft Visual Studio\18\Insiders\VC\Auxiliary\Build"
        "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build"
        "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build"
        "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build"
        "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build"
    ) do (
        if exist "%%~d\vcvarsall.bat" set VCVARS=%%~d\vcvarsall.bat
    )
)
if not "%VCVARS%"=="" (
    call "%VCVARS%" x86 >nul 2>&1
    cl.exe /EHsc /O2 /W3 /Fe:kallisto-cli.exe kallisto-cli.cpp
    if %ERRORLEVEL%==0 (
        echo [build] SUCCESS: kallisto-cli.exe built with MSVC x86
        goto done
    )
)

:: ── Try MinGW g++ (32-bit) ────────────────────────────────────────────────
where g++ >nul 2>&1
if %ERRORLEVEL%==0 (
    g++ -O2 -Wall -m32 -o kallisto-cli.exe kallisto-cli.cpp
    if %ERRORLEVEL%==0 (
        echo [build] SUCCESS: kallisto-cli.exe built with g++ -m32
        goto done
    )
)

echo [build] ERROR: No suitable C++ compiler found.
echo         Install MSVC (Visual Studio) or MinGW x86 and ensure it is on PATH.
exit /b 1

:done
:: Copy DLL next to the exe so it resolves automatically
if not exist "Kallisto_4.dll" (
    if exist "..\..\..\docs\kallisto\Kallisto_4.dll" (
        copy "..\..\..\docs\kallisto\Kallisto_4.dll" "Kallisto_4.dll" >nul
        echo [build] Copied Kallisto_4.dll
    )
)
echo [build] Done. kallisto-cli.exe is ready.

