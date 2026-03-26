cmake_minimum_required(VERSION 3.20)
project(mkaguzi_engine)
set(CMAKE_CXX_STANDARD 20)

# Release build with full optimisations
if(NOT MSVC)
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -DNDEBUG")
endif()

# If compiling with Emscripten (WASM)
if(EMSCRIPTEN)
    set(CMAKE_CXX_FLAGS "-O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s MODULARIZE=1 -s EXPORT_NAME='createEngine'")
endif()

# All engine source files (IPC binary)
set(ENGINE_SOURCES
    src/main.cpp
    src/core/bitboard.cpp
    src/core/square_map.cpp
    src/rules/movegen.cpp
    src/rules/capturegen.cpp
    src/rules/promotion.cpp
    src/rules/repetition.cpp
    src/board/position.cpp
    src/board/makemove.cpp
    src/board/hash.cpp
    src/board/fen.cpp
    src/search/search.cpp
    src/search/qsearch.cpp
    src/search/ordering.cpp
    src/search/tt.cpp
    src/search/history.cpp
    src/search/killers.cpp
    src/search/time.cpp
    src/eval/eval.cpp
    src/eval/material.cpp
    src/eval/mobility.cpp
    src/eval/tempo.cpp
    src/eval/structure.cpp
    src/eval/king_safety.cpp
    src/eval/patterns.cpp
    src/endgame/bitbase.cpp
    src/endgame/solver.cpp
    src/book/book.cpp
    src/protocol/ipc.cpp
)

# Core sources for perft (no IPC, no protocol, no main)
set(CORE_SOURCES
    src/core/bitboard.cpp
    src/core/square_map.cpp
    src/rules/movegen.cpp
    src/rules/capturegen.cpp
    src/rules/promotion.cpp
    src/rules/repetition.cpp
    src/board/position.cpp
    src/board/makemove.cpp
    src/board/hash.cpp
    src/board/fen.cpp
    src/search/tt.cpp
    src/search/history.cpp
    src/search/killers.cpp
    src/eval/eval.cpp
    src/eval/material.cpp
    src/eval/mobility.cpp
    src/eval/tempo.cpp
    src/eval/structure.cpp
    src/eval/king_safety.cpp
    src/eval/patterns.cpp
)

# Full search sources for standalone tools (no main, no IPC)
set(SEARCH_SOURCES
    ${CORE_SOURCES}
    src/search/search.cpp
    src/search/qsearch.cpp
    src/search/ordering.cpp
    src/search/time.cpp
    src/endgame/bitbase.cpp
    src/endgame/solver.cpp
    src/book/book.cpp
)

add_executable(mkaguzi ${ENGINE_SOURCES})
target_include_directories(mkaguzi PRIVATE src)

add_executable(mkaguzi_perft tests/perft/perft.cpp ${CORE_SOURCES})
target_include_directories(mkaguzi_perft PRIVATE src)

# EPD position generator for Texel tuning (50k+ qsearch-settled positions)
add_executable(mkaguzi_gauntlet tuning/generate_gauntlet.cpp ${SEARCH_SOURCES})
target_include_directories(mkaguzi_gauntlet PRIVATE src)

# PVS / Aspiration Window score-stability regression test
add_executable(mkaguzi_stability tests/stability/score_stability.cpp ${SEARCH_SOURCES})
target_include_directories(mkaguzi_stability PRIVATE src)
