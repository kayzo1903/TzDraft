cmake_minimum_required(VERSION 3.20)
project(mkaguzi_engine)
set(CMAKE_CXX_STANDARD 20)

# Release build with full optimisations
if(NOT MSVC AND NOT EMSCRIPTEN)
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -DNDEBUG")
elseif(NOT MSVC AND EMSCRIPTEN)
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
endif()

# If compiling with Emscripten (WASM) apply global optimisation flags
if(EMSCRIPTEN)
    set(CMAKE_CXX_FLAGS "-O3")
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

if(NOT EMSCRIPTEN)
    add_executable(mkaguzi ${ENGINE_SOURCES})
    target_include_directories(mkaguzi PRIVATE src)

    add_executable(mkaguzi_perft tests/perft/perft.cpp ${CORE_SOURCES})
    target_include_directories(mkaguzi_perft PRIVATE src)

    add_executable(mkaguzi_capture_regression tests/rules/capture_regression.cpp ${CORE_SOURCES})
    target_include_directories(mkaguzi_capture_regression PRIVATE src)

    add_executable(mkaguzi_draw_regression tests/rules/draw_regression.cpp ${SEARCH_SOURCES} src/wasm/wasm_api.cpp)
    target_include_directories(mkaguzi_draw_regression PRIVATE src)

    # EPD position generator for Texel tuning (50k+ qsearch-settled positions)
    add_executable(mkaguzi_gauntlet tuning/generate_gauntlet.cpp ${SEARCH_SOURCES})
    target_include_directories(mkaguzi_gauntlet PRIVATE src)

    # PVS / Aspiration Window score-stability regression test
    add_executable(mkaguzi_stability tests/stability/score_stability.cpp ${SEARCH_SOURCES})
    target_include_directories(mkaguzi_stability PRIVATE src)

    # Eval regressions for promotion-race orientation
    add_executable(mkaguzi_eval_regression tests/eval/promotion_orientation.cpp ${CORE_SOURCES})
    target_include_directories(mkaguzi_eval_regression PRIVATE src)
endif()

# ──────────────────────────────────────────────────────────────────────────────
# WASM target — only built when using Emscripten (emcmake cmake ...)
#
# Build instructions:
#   cd engines/core
#   mkdir build-wasm && cd build-wasm
#   emcmake cmake .. -DCMAKE_BUILD_TYPE=Release
#   emmake make mkaguzi_wasm
#   # Artifacts: mkaguzi_wasm.js + mkaguzi_wasm.wasm
#   # Copy both to packages/mkaguzi-engine/wasm/
#   # Then run: pnpm --filter @tzdraft/mkaguzi-engine build  (rebuilds search-worker.js)
#   # frontend/public/wasm/ is populated automatically via predev/prebuild hooks
# ──────────────────────────────────────────────────────────────────────────────
if(EMSCRIPTEN)
    # Sources: full engine minus IPC/main — wasm_api.cpp is the new entry point
    set(WASM_SOURCES
        src/wasm/wasm_api.cpp
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
    )

    add_executable(mkaguzi_wasm ${WASM_SOURCES})
    target_include_directories(mkaguzi_wasm PRIVATE src)

    # Exported C functions (prefixed with _ for Emscripten)
    set(WASM_EXPORTS
        "_mkz_init"
        "_mkz_initial_fen"
        "_mkz_generate_moves"
        "_mkz_apply_move"
        "_mkz_search"
        "_mkz_game_result"
        "_mkz_pos_to_fen"
    )
    string(JOIN "," WASM_EXPORTS_STR ${WASM_EXPORTS})

    target_link_options(mkaguzi_wasm PRIVATE
        -O3
        -sWASM=1
        -sALLOW_MEMORY_GROWTH=1
        -sMODULARIZE=1
        "-sEXPORT_NAME='MkaguziModule'"
        "-sEXPORTED_FUNCTIONS=[${WASM_EXPORTS_STR}]"
        "-sEXPORTED_RUNTIME_METHODS=[\"ccall\",\"cwrap\",\"UTF8ToString\",\"stringToUTF8\",\"lengthBytesUTF8\"]"
        -sNO_EXIT_RUNTIME=1
        "-sENVIRONMENT=web,worker"
        -sEXPORT_ES6=1
        # search() and qsearch() each allocate Move moves[256] = ~8 KB per frame
        # (Move struct is 32 bytes after captures[] was expanded to [12] for flying kings).
        # At depth 20 + qsearch 26 levels that is ~370 KB of shadow stack.
        # Default 64 KB stack overflows at depth ~10.  Raise to 4 MB.
        -sSTACK_SIZE=4194304
    )
endif()
