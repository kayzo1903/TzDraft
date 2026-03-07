## sidra-cli

Minimal wrapper executable for SiDra DLL.

### Build (MSVC)
From a Visual Studio Developer Command Prompt:

```bat
cd C:\Users\Admin\Desktop\TzDraft\engines\sidra\cli
cl /EHsc /O2 sidra-cli.cpp /link /OUT:sidra-cli.exe
```

Place the output in:
`C:\Users\Admin\Desktop\TzDraft\engines\sidra\bin\sidra-cli.exe`

### Runtime
Ensure `SiDra.dll` (built from `SiDra.sln`) is in the same folder as the CLI
or set `SIDRA_DLL_PATH` to the DLL path.
