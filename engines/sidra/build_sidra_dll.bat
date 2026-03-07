@echo off
cd %~dp0
if not exist "bin" mkdir bin

echo Building SiDra DLL...
cl /LD /Fe:bin\SiDra.dll /O2 /D_WINDOWS /D_USRDLL /D_WINDLL *.cpp /link /EXPORT:EI_Initialization /EXPORT:EI_NewGame /EXPORT:EI_SetupBoard /EXPORT:EI_SetTimeControl /EXPORT:EI_SetTime /EXPORT:EI_Think

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

echo Build success! DLL is in bin\SiDra.dll
exit /b 0
