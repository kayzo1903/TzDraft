cmake_minimum_required(VERSION 3.10)
project(sidra)

set(CMAKE_CXX_STANDARD 17)

# Define sources for the engine library (excluding main.cpp which is the Windows DLL entry point)
set(ENGINE_SOURCES
    Board.cpp
    Evaluate.cpp
    Generator.cpp
    Move.cpp
    Search.cpp
    Time.cpp
    Utils.cpp
    ED.cpp
    SidraEngine.cpp
)

# CLI wrapper source
set(CLI_SOURCE cli/sidra-cli.cpp)

# Create a static library for the engine
add_library(sidra_lib STATIC ${ENGINE_SOURCES})
target_compile_definitions(sidra_lib PRIVATE SIDRA_STATIC)

# Create the standalone executable
add_executable(sidra ${CLI_SOURCE})

# Link the engine library to the executable
target_link_libraries(sidra PRIVATE sidra_lib)

# Define SIDRA_STATIC for the CLI so it knows to call functions directly
target_compile_definitions(sidra PRIVATE SIDRA_STATIC)

# Output directory for binaries
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/bin)
