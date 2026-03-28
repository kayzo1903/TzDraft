#ifndef PROTOCOL_MESSAGES_H
#define PROTOCOL_MESSAGES_H

#include "core/types.h"
#include "rules/variant.h"
#include <string>
#include <vector>

// Message types received from client
enum class MsgType {
    SetVariant,
    SetPosition,
    Go,
    Stop,
    Probe,
    EvalTrace,
    Quit,
    Unknown
};

struct GoParams {
    int  depth;      // 0 = unlimited
    int  timeMs;     // 0 = unlimited
    int  multiPV;    // default 1
    int  level;      // ai level (15-19)
    int  randomness; // eval noise amplitude (cp)
};

struct IncomingMsg {
    MsgType  type;
    // SetVariant
    std::string variant;
    // SetPosition / EvalTrace / Probe
    std::string fen;
    // SetPosition: optional prior game FENs for repetition detection
    std::vector<std::string> history;
    // Go
    GoParams go;
};

#endif // PROTOCOL_MESSAGES_H
