#ifndef PROTOCOL_IPC_H
#define PROTOCOL_IPC_H

// Enter the main JSON IPC message loop.
// Reads from stdin, writes to stdout.
// Returns when "quit" message is received or stdin is closed.
void runIpcLoop();

#endif // PROTOCOL_IPC_H
