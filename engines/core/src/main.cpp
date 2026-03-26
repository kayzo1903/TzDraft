#include "core/square_map.h"
#include "board/hash.h"
#include "protocol/ipc.h"

int main() {
    // Initialize lookup tables
    initSquareMaps();
    initZobrist();

    // Enter the JSON IPC message loop
    runIpcLoop();

    return 0;
}
