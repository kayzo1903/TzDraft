# TzDraft Project Evaluation Report

**Date:** 2026-03-22  
**Time:** 11:46:38 +03:00  
**Prepared by:** Codex  
**Scope:** Full project-level evaluation across product maturity, architecture, UX, backend reliability, developer experience, and production readiness

---

## Executive Score

**Overall score: 78 / 100**

TzDraft is a strong, ambitious product with a real multi-surface platform already in place. It is clearly beyond prototype stage. The app includes real gameplay, online and friend flows, AI progression, tournaments, admin tools, bilingual support, support contact, and improving SEO.

The project scores well because the foundation is real and the product direction is clear. It does not score in the mid-80s yet because reliability, consistency, verification workflows, and feature hardening still need work.

Short verdict:

- Strong product vision
- Good technical foundation
- Real momentum
- Not fully hardened yet

---

## Category Scores

| Area | Score | Notes |
| --- | ---: | --- |
| Product vision | 88 | Clear scope, real platform thinking, strong ambition |
| Frontend UX/UI | 80 | Good momentum and many refined pages, but consistency still varies |
| Backend/domain design | 74 | Solid architecture, but some contracts and lifecycle logic remain uneven |
| Reliability/stability | 68 | Several bugs were real and fixable, but they show hardening is still in progress |
| Developer experience | 70 | Monorepo is workable, but build and verification friction is still costly |
| Production readiness | 72 | Stronger than average, but not yet uniformly hardened |

---

## What Is Working Well

### 1. Product breadth is real

This is not a narrow demo. The project already includes:

- Auth and session flows
- Local, AI, online, and friend play
- Tournament creation, registration, admin monitoring, and public listing
- Leaderboard and profile surfaces
- Support/contact flow
- Swahili and English UI
- SEO work on multiple routes

That is meaningful product depth.

### 2. The stack is strong

The core platform choices are solid:

- Frontend: Next.js 16, React 19, next-intl, Tailwind
- Backend: NestJS 11, Prisma, Socket.IO
- Shared monorepo structure with reusable packages

This gives the project a credible long-term base.

### 3. UX quality is improving

Recent work shows good product taste:

- better play-mode surfacing
- better community/tournament presentation
- more usable admin flows
- better SEO structure
- stronger support/help experience

This is pushing the project from functional toward usable and discoverable.

### 4. The app has real operational thinking

You are not only building features. You are already addressing:

- guest-user leakage into competitive surfaces
- AI progression as trusted backend data
- tournament lifecycle automation
- support categories and contact flow
- admin operational controls

That is a strong sign of product maturity.

---

## Main Gaps

### 1. Reliability is still uneven

The project has had several real breakpoints during implementation:

- Prisma schema and migration drift
- auth refresh race conditions
- session hydration and admin redirects
- tournament lifecycle inconsistencies
- frontend/backend contract mismatches

These are fixable, but they lower confidence until more of the system is stabilized.

### 2. Backend and frontend contracts are not fully normalized

A few important areas were relying on inference instead of explicit shared truth:

- guest account handling
- AI progression and unlock tracking
- tournament public status semantics
- winner/champion display data
- some admin and support flows

The project is moving in the right direction, but this still needs more normalization.

### 3. Verification workflow is weaker than it should be

Current development friction is a real quality risk:

- inconsistent or missing verification scripts
- Windows `EPERM` lock issues on `tsc`
- build checks not always easy to run cleanly

This slows safe iteration and makes regressions easier to miss.

### 4. Tournament system is promising but not fully mature

Tournament support is already meaningful, but still has important gaps:

- moderation after start is limited
- champion data is not exposed as cleanly as it should be
- status semantics needed fixes and may still need more hardening
- some public pages derive too much from partial state

This is one of the most important systems to continue hardening.

### 5. Production readiness is uneven across surfaces

Some areas now look close to production quality, while others are still in a Phase 1 shape. The project needs more consistency in:

- validation
- test coverage
- error handling
- observability
- failure-state UX

---

## Risk Summary

### High priority risks

1. Build and verification friction can hide regressions.
2. Tournament and session state bugs can break trust quickly for real users.
3. Cross-surface inconsistencies create maintenance cost.

### Medium priority risks

1. Some admin and support flows are still maturing.
2. Some pages are now polished while others lag behind.
3. Data semantics around progression, outcomes, and user state still need more explicit modeling.

---

## Recommended Starting Plan

This is the clearest order to improve the project from 78 toward 85+.

### Phase 1 - Stabilize the foundation

**Goal:** make the project safer to change.

1. Fix the verification workflow first.
   - Add a consistent frontend type-check script.
   - Add a consistent root verification command for frontend and backend.
   - Reduce Windows lock friction where possible.
   - Make "can this branch ship?" easy to answer.

2. Standardize project health checks.
   - Define minimum checks for every meaningful change:
     - backend build or type-check
     - frontend type-check
     - critical smoke flow checks

3. Audit the highest-risk regressions.
   - Auth refresh
   - admin session persistence
   - tournament create/start/register flow
   - support form submission

**Why start here:** better verification improves every later change.

---

### Phase 2 - Harden tournament as a flagship system

**Goal:** make tournaments trustworthy and internally consistent.

1. Normalize tournament public state.
   - One clear backend source of truth for open, active, completed, and cancelled.
   - Remove frontend guesswork where possible.

2. Expose cleaner summary data from the backend.
   - champion/winner display data
   - participant counts
   - closure reason
   - current round

3. Expand admin tournament operations.
   - cancel flow
   - disqualification/moderation for active tournaments
   - clearer audit/history signals for edits and automated actions

4. Reduce N+1 fetch patterns on tournament listing pages.

**Why this comes second:** tournaments are one of the most visible and highest-value features, and trust matters here.

---

### Phase 3 - Normalize identity and progression models

**Goal:** reduce hidden inconsistency in core user-state systems.

1. Continue formalizing account types across all surfaces.
   - Guests should remain hidden from competitive/public surfaces everywhere.

2. Finish backend-backed AI progression usage.
   - Make unlocks and eligibility rely on trusted backend progress for registered users.
   - Audit any remaining local-only assumptions.

3. Clean shared contracts for user-facing summaries.
   - account type
   - progression state
   - leaderboard eligibility
   - tournament eligibility

**Why this matters:** these are the systems that affect trust, fairness, and long-term maintainability.

---

### Phase 4 - Raise the floor on production quality

**Goal:** make the app feel uniformly polished and safer to operate.

1. Improve error handling and fallback UX on important pages.
2. Add more targeted regression coverage around auth, tournaments, and play flows.
3. Continue SEO and metadata improvements on remaining routes.
4. Standardize responsive quality across setup and admin pages.
5. Improve observability around support, auth, and tournament automation.

---

## Best Next Task To Start With

If only one thing should start next, start here:

**Create a reliable project-wide verification workflow.**

That means:

- add a frontend type-check script
- add a root-level verification command
- document the standard local verification steps
- make it easy to run the same checks before and after meaningful changes

This will improve confidence across every other roadmap item.

---

## Final Assessment

TzDraft is a serious project with strong potential. It already has enough product scope and technical structure to be taken seriously. The current score of **78 / 100** reflects a product that is clearly real and promising, but still needs hardening before it can be called fully production-polished.

The project does not need a restart. It needs focused stabilization, contract cleanup, and flagship-feature hardening.

With disciplined work on verification, tournament consistency, and system normalization, the project can move into the **85+ range**.
