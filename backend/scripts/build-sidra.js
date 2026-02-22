const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';
const engineDir = path.resolve(__dirname, '../../engines/sidra');
const buildDir = path.join(engineDir, 'build');
const binDir = path.join(engineDir, 'bin');

console.log('Checking for CMake...');
const cmakeCheck = spawnSync('cmake', ['--version']);

if (cmakeCheck.error) {
  console.log('CMake not found. Skipping Sidra engine build.');
  // On Render, we might want to fail if cmake is missing, but for local dev we skip
  if (process.env.RENDER) {
    console.error('Error: CMake is required for building Sidra on Render.');
    process.exit(1);
  }
  process.exit(0);
}

console.log('Building Sidra Engine...');

// Create directories
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

// Configure
const cmakeConfig = spawnSync('cmake', ['..', '-DCMAKE_BUILD_TYPE=Release'], {
  cwd: buildDir,
  stdio: 'inherit',
});

if (cmakeConfig.status !== 0) {
  console.error('CMake configuration failed.');
  process.exit(1);
}

// Build
const cmakeBuild = spawnSync('cmake', ['--build', '.', '--config', 'Release'], {
  cwd: buildDir,
  stdio: 'inherit',
});

if (cmakeBuild.status !== 0) {
  console.error('Sidra build failed.');
  process.exit(1);
}

// Copy binary
const srcBinName = isWin ? 'Release/sidra.exe' : 'sidra'; // CMake Release folder on Windows usually
// Actually on Linux it's directly in buildDir if not specified otherwise, but CMAKE_RUNTIME_OUTPUT_DIRECTORY was set to 'bin' in CMakeLists.txt
// My CMakeLists.txt set CMAKE_RUNTIME_OUTPUT_DIRECTORY to ${CMAKE_CURRENT_SOURCE_DIR}/bin
// So it should be in bin already!
// Let's check CMakeLists.txt
/*
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/bin)
*/
// So cmake --build will put it in bin directly.
// But on Windows with MSVC, it appends Release/Debug.
// So on Windows it might be bin/Release/sidra.exe or just bin/sidra.exe depending on generator.
// If using Ninja or Makefiles, it's bin/sidra.
// If using Visual Studio generator, it's bin/Release/sidra.exe.

console.log('Sidra build completed successfully.');
