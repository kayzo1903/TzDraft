@echo off
cd /d "C:\Users\Admin\Desktop\TzDraft\engines\sidra"
"C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\devenv.exe" SiDra.sln /build "Release|x64"
if %errorlevel% equ 0 (
    echo Build succeeded!
    if exist "Release\SiDra.dll" (
        copy "Release\SiDra.dll" "bin\SiDra.dll"
        echo DLL copied to bin\
    ) else if exist "x64\Release\SiDra.dll" (
        copy "x64\Release\SiDra.dll" "bin\SiDra.dll"
        echo DLL copied to bin\
    ) else (
        echo Warning: Could not find SiDra.dll in expected locations
        dir /s SiDra.dll
    )
) else (
    echo Build failed!
    exit /b 1
)
