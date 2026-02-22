# Official TZD Rules Engine

This package layers the Tanzania Draughts-64 Official Rules draw logic on top of the CAKE engine.

It re-exports all CAKE engine types and services and adds:

- `OfficialEngine` (drop-in engine wrapper)
- `OfficialRuleState` (rule counters and repetition tracking)

Use this engine for testing official rules before final integration.
