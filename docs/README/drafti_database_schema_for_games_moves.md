# Drafti – Database Schema for Games & Moves

## 1. Purpose
This document defines the **authoritative database schema** for Drafti games, moves, and related entities.

The schema is:
- Derived strictly from the **Tanzania Drafti ruleset**
- Aligned with **DDD (Domain‑Driven Design)**
- Optimized for an **MVP monolith**, but scalable
- Inspired by **chess.com–style game storage & replay**

---

## 2. Core Design Principles

1. **Game is the Aggregate Root**
2. Moves are immutable, append‑only
3. Board state can be reconstructed from moves
4. Domain logic never depends on DB schema
5. Read optimization does not pollute domain purity

---

## 3. High‑Level Entity Overview

```
User
 └── Game
      ├── Player (White / Black)
      ├── Move (1..N)
      ├── Clock
      └── Result
```

---

## 4. Table: users

Stores player identities.

```
users
-----
id              UUID (PK)
username        VARCHAR (unique)
display_name    VARCHAR
created_at      TIMESTAMP
```

---

## 5. Table: games (Aggregate Root)

Represents a single Drafti match.

```
games
-----
id                UUID (PK)
status            ENUM('WAITING','ACTIVE','FINISHED','ABORTED')
game_type         ENUM('RANKED','CASUAL','AI')
rule_version      VARCHAR (e.g. 'TZ-8x8-v1')
created_at        TIMESTAMP
started_at        TIMESTAMP
ended_at          TIMESTAMP

white_player_id  UUID (FK users.id)
black_player_id  UUID (FK users.id | NULL for AI)

white_elo        INT
black_elo        INT

ai_level         INT NULL (350–2500)

winner           ENUM('WHITE','BLACK','DRAW', NULL)
end_reason       ENUM('CHECKMATE','RESIGN','TIME','DISCONNECT','DRAW')
```

Notes:
- `rule_version` allows future rule changes
- AI games store `ai_level`

---

## 6. Table: moves

Immutable move history.

```
moves
-----
id              UUID (PK)
game_id         UUID (FK games.id)
move_number     INT
player          ENUM('WHITE','BLACK')

from_square     INT (1–32)
to_square       INT (1–32)

captured_squares INT[]  (ordered)

is_promotion    BOOLEAN
is_multi_capture BOOLEAN

notation        VARCHAR   -- e.g. 22x17x10
engine_eval     INT NULL  -- centipawn equivalent

created_at      TIMESTAMP
```

Constraints:
- `(game_id, move_number)` unique
- Moves are **append‑only**

---

## 7. Table: clocks

Tracks time control.

```
clocks
------
game_id        UUID (PK, FK games.id)
white_time_ms  BIGINT
black_time_ms  BIGINT
last_move_at   TIMESTAMP
```

---

## 8. Table: ratings (optional MVP+)

Stores ELO snapshots.

```
ratings
-------
user_id       UUID (FK users.id)
rating        INT
games_played  INT
last_updated  TIMESTAMP
```

---

## 9. Read Models (Performance)

These are **query‑optimized** and may diverge from domain shape.

### game_summary

```
- game_id
- white_username
- black_username
- status
- winner
- total_moves
- created_at
```

Used for:
- Match history
- Profile pages

---

## 10. Board Reconstruction Strategy

Board state is derived by:

1. Start from initial setup
2. Apply moves sequentially
3. Respect capture chains & promotion

Optional optimization:

```
games.current_fen_like_state
```

Used only as cache, never as truth.

---

## 11. DDD Mapping

| DDD Concept | Database |
|------------|----------|
| Aggregate Root | games |
| Entity | moves |
| Value Object | square, notation |
| Domain Event | move_created |

Repositories:
- GameRepository
- MoveRepository (internal)

---

## 12. Transaction Rules

- Move creation is atomic
- Clock update happens in same transaction
- Engine moves validated before insert

---

## 13. Anti‑Cheat Guarantees

- Server writes moves
- Clients never persist moves
- Engine suggestions validated

---

## 14. Scalability Notes

MVP:
- Single PostgreSQL
- JSON logs optional

Later:
- Read replicas
- Event sourcing
- Game archive tables

---

## 15. Summary

This schema ensures:
- Rule safety
- Replayability
- Auditability
- Chess.com‑level history tracking

> The database remembers everything. The domain decides what matters.

