# Drafti – Project Overview

## 1. What is Drafti?

**TzDraft** is a competitive, online **Tanzanian Draft (Draughts) gaming platform**, inspired by the experience and polish of chess.com, but purpose-built for the **8×8 Tanzania Drafti ruleset**.

TzDraft allows players to:
- Play **real-time competitive matches** against other players
- Play against **computer (AI) opponents** with skill levels similar to ELO ratings
- Track progress, ratings, and game history
- Experience fair, server-authoritative gameplay

TzDraft is designed as a **modern, scalable game platform**, starting as a small MVP but capable of growing into a global competitive ecosystem.

---

## 2. Vision & Goals

### Vision
To become the **definitive digital home** for Tanzania Drafti, just as chess.com is for chess.

### Core Goals
- Preserve **official Tanzanian Drafti rules** digitally
- Ensure **fair play** through server-side validation
- Support both **human and AI opponents**
- Build a foundation that scales from **local play to global competition**

---

## 3. Core Features

### Gameplay
- 8×8 Tanzania Drafti board
- Mandatory captures and maximum-capture enforcement
- King promotion and multi-capture sequences
- Game clocks and time controls

### Play Modes
- Player vs Player (online, real-time)
- Player vs Computer (AI levels: 350–2500)
- Casual and rated games

### Competitive System
- ELO-based rating system
- Matchmaking based on rating and latency
- Game history and replay support

---

## 4. Technical Philosophy

Drafti is built with the following principles:

1. **Server-Authoritative**
   - All moves, clocks, and rules are validated on the server
   - Clients are treated as untrusted viewers

2. **Domain-Driven Design (DDD)**
   - Game rules are the core domain
   - Clear separation between Domain, Application, Infrastructure, and Interface layers

3. **Monolith First, Scalable Later**
   - Start as a clean DDD monolith
   - Future-ready for microservices if needed

---

## 5. Architecture Overview (High Level)

```
Client (Web / Mobile)
        │
        ▼
API Server (NestJS)
        │
        ├─ Game Domain (rules, validation, capture logic)
        ├─ Matchmaking & Rating
        ├─ AI Engine Integration
        │
        ▼
Realtime Server (WebSocket)
        │
        ▼
Database (Games, Moves, Players)
```

---

## 6. AI & Engine Integration

Drafti integrates draught engines (e.g. CAKE-compatible engines) to:
- Power computer opponents
- Simulate different skill levels
- Provide future analysis and training tools

AI difficulty is controlled by:
- Search depth
- Time limits
- Engine evaluation constraints

---

## 7. Fair Play & Trust

Drafti enforces fairness by:
- Preventing client-side rule enforcement
- Logging every move immutably
- Detecting abnormal patterns
- Restricting engine usage to server-side only

---

## 8. Who is Drafti For?

- Casual players who enjoy local Tanzanian Drafti
- Competitive players seeking ranked matches
- Learners who want to improve using AI opponents
- Communities that want organized, fair competitions

---

## 9. Long-Term Roadmap

- Tournaments & leagues
- Spectator mode & live games
- Analysis boards & move suggestions
- Mobile apps
- Regional and international rankings

---

## 10. Summary

Drafti is:

- 🎯 A **competitive Tanzania Drafti platform**
- ⚖️ Built on **official rules and fair play**
- 🧠 Powered by **AI engines and ELO matchmaking**
- 🏗️ Designed with **DDD and scalability in mind**

Drafti is not just a game — it is a **platform for serious play, learning, and competition**.