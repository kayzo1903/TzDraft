#ifndef PROTOCOL_MESSAGES_H
#define PROTOCOL_MESSAGES_H

#include "core/types.h"
#include "rules/variant.h"
#include <string>

// Message types received from client
enum class MsgType {
    SetVariant,
    SetPosition,
    Go,
    Stop,
    EvalTrace,
    Quit,
    Unknown
};

struct GoParams {
    int  depth;      // 0 = unlimited
    int  timeMs;     // 0 = unlimited
    int  multiPV;    // default 1
};

struct IncomingMsg {
    MsgType  type;
    // SetVariant
    std::string variant;
    // SetPosition / EvalTrace
    std::string fen;
    // Go
    GoParams go;
};

#endif // PROTOCOL_MESSAGES_H
