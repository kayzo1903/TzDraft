# TzDraft Mobile App Adaptation Plan

Date: 2026-03-07
Owner: TzDraft Team
Status: Draft Plan

## 1. Goal

Adapt the current web platform into production-ready iOS and Android mobile apps while reusing the existing backend (NestJS + Socket.IO + Prisma) and the CAKE engine where it makes sense.

Success means:
- App Store and Play Store releases with stable online play.
- Mobile-auth flows (JWT/OAuth/OTP) working reliably.
- Mobile UX optimized for touch, small screens, and unstable networks.
- Operational readiness for mobile releases (crash reporting, analytics, CI/CD, store rollout process).

## 2. Recommended Technical Direction

Primary choice: React Native with Expo (managed workflow + EAS build).

Why:
- Team already uses React/TypeScript, reducing ramp-up time.
- Fastest path to dual-platform delivery.
- Good support for WebSocket, auth, push notifications, OTA updates, and store builds.

Alternatives (not recommended for first release):
- Flutter: strong performance but larger rewrite cost.
- Native iOS/Android: best control, highest delivery cost/time.

## 3. Reuse vs Rewrite Strategy

Reuse directly:
- Backend APIs and WebSocket protocols.
- Domain rules from `packages/cake-engine` where environment-compatible.
- Existing game and matchmaking business logic at server level.

Rewrite for mobile:
- Frontend UI layer (Next.js pages/components -> React Native screens/components).
- Web-specific auth/session handling (cookies/browser assumptions).
- Voice chat implementation details (WebRTC integration via React Native compatible libs).

Refactor for shared code:
- Create `packages/shared-client` for DTOs, API contracts, socket event types, and validation schemas.
- Move non-UI game helpers from frontend hooks into shared packages.

## 4. Delivery Phases

## Phase 0: Architecture and Foundations (1 week)

- Confirm mobile stack: Expo + React Native + TypeScript.
- Define mobile app modules:
  - `apps/mobile` (new app)
  - `packages/shared-client` (new shared contracts/types)
- Decide auth token storage strategy:
  - Access token in memory.
  - Refresh token in secure storage (Expo SecureStore / Keychain / Keystore).
- Define analytics and crash reporting baseline (Sentry + product analytics).
- Freeze v1 feature scope.

Exit criteria:
- RFC approved for stack, auth model, and v1 scope.
- Mobile project bootstrapped in monorepo.

## Phase 1: Core App Shell + Auth (2 weeks)

- Build navigation structure (auth stack + app tabs/stacks).
- Implement auth flows:
  - Login/signup.
  - OTP verification.
  - Google OAuth mobile flow (deep-link callback).
  - Refresh token lifecycle and silent re-auth.
- Set up localization (`sw`, `en`) in mobile.
- Add environment config for dev/staging/prod API endpoints.

Exit criteria:
- User can create account, login, logout, and relaunch app with valid session.

## Phase 2: Gameplay v1 (3 weeks)

- Build mobile game board UI with touch gestures.
- Port local game mode first (offline-friendly validation using CAKE where possible).
- Add online game mode:
  - Game state sync via Socket.IO.
  - Reconnect/resync behavior after network drop.
  - Clock sync tolerance and drift handling.
- Add matchmaking and invite flow.
- Ensure move input is optimized for touch accuracy.

Exit criteria:
- Stable local and online matches on real devices (mid/low-end Android included).

## Phase 3: Voice, Notifications, and Reliability (2 weeks)

- Integrate voice chat for mobile-compatible WebRTC.
- Add push notifications:
  - Match found.
  - Opponent move/rematch.
  - Invite accepted.
- Add offline and bad-network UX states.
- Add app lifecycle handling:
  - Background/foreground transitions.
  - Session/socket recovery.

Exit criteria:
- App handles backgrounding and reconnect without game corruption.

## Phase 4: Hardening, QA, and Store Launch (2 weeks)

- Performance profiling on real devices.
- Accessibility pass (text scaling, touch targets, contrast).
- Security review:
  - Token storage.
  - TLS pinning decision.
  - API abuse controls.
- Test strategy:
  - Unit tests (shared/domain logic).
  - Integration tests (API/socket client behaviors).
  - E2E smoke tests (Detox or Maestro).
- Release pipeline:
  - EAS build profiles (dev/staging/prod).
  - Internal test distribution (TestFlight/Internal Testing).
  - Store metadata, privacy forms, policy compliance.

Exit criteria:
- Release candidates accepted on both stores.
- Rollback and hotfix runbook prepared.

## 5. V1 Scope (Must-Have)

- Auth (email/password + OTP + Google sign-in if feasible in v1).
- Local game mode.
- Online quick match.
- Play-with-friend (invite code).
- Core profile + settings.
- Swahili/English localization.
- Sentry crash/error monitoring.

Out of v1 (defer):
- Advanced replay tooling.
- Tournament mode.
- Non-critical social features.

## 6. Key Risks and Mitigations

- Real-time sync instability on mobile networks.
  - Mitigation: explicit reconnect protocol, state versioning, idempotent socket events.
- Auth complexity across mobile/web backends.
  - Mitigation: unify token contract in shared package, add contract tests.
- Voice chat fragmentation across devices.
  - Mitigation: phase-gate voice, fallback to disabled voice per device capability.
- Delivery slip due to scope creep.
  - Mitigation: enforce v1 feature freeze before Phase 2.

## 7. Team and Ownership

- Mobile Lead: React Native architecture and release process.
- Backend Lead: mobile auth/socket compatibility and endpoint hardening.
- QA Lead: device matrix, regression suites, release sign-off.
- Product/Design: mobile UX adaptation and localization quality.

## 8. Estimated Timeline

- Total: 8-10 weeks to first production release.
- Fast-track MVP (without voice chat): 6-7 weeks.

## 9. Immediate Next Actions (Next 7 Days)

- Create `apps/mobile` using Expo TypeScript template.
- Create `packages/shared-client` and move shared DTO/socket types.
- Write mobile auth RFC (token lifecycle + secure storage + OAuth deep linking).
- Define v1 screen list and navigation map.
- Stand up staging API environment specifically for mobile QA.
