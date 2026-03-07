#!/bin/bash
set -e

# Navigate to script directory
cd "$(dirname "$0")"

echo "Building Sidra Engine..."

# Create build directory
mkdir -p build
cd build

# API_CALL and DLL_EXPORT are handled by preprocessor in SidraEngine.cpp check
# using Cmake
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release

# Copy binary to bin
mkdir -p ../bin
cp sidra ../bin/sidra
chmod +x ../bin/sidra

echo "Sidra build complete."
