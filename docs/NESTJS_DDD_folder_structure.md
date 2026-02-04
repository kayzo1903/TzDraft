# Drafti – NestJS DDD Module & Folder Mapping

## 1. Purpose

This document defines a **DDD-aligned folder and module structure** for the Drafti MVP in NestJS.
It ensures:

* **Separation of concerns** (Domain, Application, Infrastructure, Interface)
* **Scalability and maintainability**
* Direct mapping to prior foundational pillars (rules, engine, validation, clock, etc.)

---

## 2. Proposed Folder Structure

```
src/
├── domain/
│   ├── game/
│   │   ├── entities/
│   │   │   ├── game.entity.ts
│   │   │   ├── player.entity.ts
│   │   │   └── move.entity.ts
│   │   ├── value-objects/
│   │   │   ├── square.vo.ts
│   │   │   └── board-state.vo.ts
│   │   ├── services/
│   │   │   ├── move-validation.service.ts
│   │   │   └── capture-finding.service.ts
│   │   └── rules/
│   │       ├── tanzania-drafti.rules.ts
│   │       └── engine-translation.rules.ts
│   └── user/
│       ├── entities/user.entity.ts
│       └── value-objects/elo.vo.ts
│
├── application/
│   ├── commands/
│   │   ├── make-move.command.ts
│   │   ├── resign.command.ts
│   │   └── start-game.command.ts
│   ├── handlers/
│   │   └── game-command.handlers.ts
│   └── dtos/
│       └── move.dto.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── prisma.service.ts
│   │   ├── repositories/
│   │   │   ├── game.repository.ts
│   │   │   └── move.repository.ts
│   ├── websocket/
│   │   ├── gateways/
│   │   │   └── game.gateway.ts
│   │   └── adapters/
│   │       └── socket.adapter.ts
│   └── engines/
│       ├── engine-adapter.ts
│       └── ai-levels/
│           ├── level-350.ts
│           └── level-2500.ts
│
├── interface/
│   ├── controllers/
│   │   └── game.controller.ts
│   ├── dtos/
│   │   └── game.dto.ts
│   └── filters/
│       └── http-exception.filter.ts
│
├── shared/
│   ├── constants/
│   ├── utils/
│   └── types/
│
└── main.ts
```

---

## 3. Module Mapping

| NestJS Module   | DDD Layer                             | Responsibilities                                                                           |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| GameModule      | Domain + Application + Infrastructure | Encapsulates Game aggregate, moves, rules, validation, capture-finding, engine integration |
| UserModule      | Domain + Application                  | Handles player entities, ELO, profile info                                                 |
| WebsocketModule | Infrastructure                        | Real-time WS gateways, event broadcasting                                                  |
| DatabaseModule  | Infrastructure                        | Prisma or other DB connectivity, repositories                                              |
| SharedModule    | Shared                                | Constants, utility functions, shared types                                                 |

---

## 4. Integration Flow

1. **Interface** → Receives commands (HTTP/WebSocket)
2. **Application** → Maps commands to domain services
3. **Domain** → Applies rules, validation, capture-finding, engine translation
4. **Infrastructure** → Persists results, broadcasts updates

This ensures **server-authoritative execution** with full DDD separation.

---

## 5. Advantages

* Scalable **DDD monolith** structure
* Easy to extend **AI engines** or **rule changes**
* Testable at all layers (unit + integration)
* Supports **multi-module NestJS architecture** for future microservices


