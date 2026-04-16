# TzDraft Mobile — Phase 1 Achieved

**Date completed:** 2026-04-14
**Branch:** `feat/mobile-api-connectivity`
**Status:** ✅ Complete — ready to merge ahead of Phase 2

---

## What Phase 1 covered

Phase 1 was defined as: *Core App Shell + Auth*. The exit criterion was:
> User can create account, login (password or Google), logout, and relaunch app with valid session.

That criterion is met. Below is a full inventory of everything shipped.

---

## 1. Project bootstrap

| Item | Detail |
|---|---|
| Framework | Expo 54 (managed workflow), React Native 0.81.5, React 19 |
| Language | TypeScript (strict) |
| Navigation | Expo Router 6 (file-based, Stack + route groups) |
| State | Zustand 4.5 with `persist` middleware |
| HTTP client | Axios with interceptors |
| Storage | `expo-secure-store` for tokens and persisted auth state |
| Localization | `react-i18next` — English + Swahili (`packages/translations`) |
| Styling | React Native StyleSheet + `tailwind.config.js` for class utilities |
| Monorepo | `pnpm` workspaces, lives in `apps/mobile` |

---

## 2. Auth system

### Flows implemented

| Flow | File | Status |
|---|---|---|
| Login (username/phone + password) | `app/(auth)/login.tsx` | ✅ |
| Google Sign-In (OAuth 2.0 via WebBrowser) | `app/(auth)/login.tsx` + `auth-client.ts` | ✅ |
| OTP phone verification | `app/(auth)/signup.tsx` (step 1–2) | ✅ |
| Registration (username + password) | `app/(auth)/signup.tsx` (step 3) | ✅ |
| Guest session (ephemeral) | `welcome.tsx` → `authClient.loginAsGuest()` | ✅ |
| Silent token refresh | `src/lib/api.ts` response interceptor | ✅ |
| Logout (server session invalidation) | `src/lib/auth-client.ts` | ✅ |
| Session persistence across cold starts | Zustand `persist` + SecureStore | ✅ |

### Session architecture

- **Access token** — held in Zustand state, attached to every request by the Axios request interceptor
- **Refresh token** — stored separately in `SecureStore` under key `"refreshToken"`
- **Auth state** — persisted to `SecureStore` under `"tzdraft-auth-storage"` (user object + token); status and `isAuthenticated` are derived on rehydration
- **Logout session-leak fix** — `store.logout()` is called *before* the `/auth/logout` API call so the request interceptor never attaches an expired access token; the server invalidates the session via the refresh token in the request body alone

### Auth status lifecycle

```
loading → (rehydration) → unauthenticated | guest | authenticated
                          ↕ transitioning (during login/register/guest calls)
```

### Guest session behaviour

Guest sessions are **ephemeral** — `status === "guest"` receives no redirect from welcome/auth screens, so the user always returns to `/welcome` on the next cold start. Guests can freely navigate welcome, auth, and app screens without forced redirects.

### Google Sign-In (mobile)

`authClient.loginWithGoogle()` opens `${API_URL}/auth/google/mobile` via `expo-web-browser`'s `WebBrowser.openAuthSessionAsync`. On success the backend redirects to the deep link `tzdraft-mobile://auth/callback?accessToken=…&refreshToken=…`. The client parses the URL, fetches the user profile via `GET /auth/me`, and completes the session. User cancellation is handled gracefully (no error shown).

---

## 3. Navigation guard

**File:** `app/_layout.tsx`

| Rule | Behaviour |
|---|---|
| `unauthenticated` on non-welcome/non-auth screen | redirect → `/welcome` |
| `authenticated` on welcome/auth screen | redirect → `/` (home) |
| `guest` anywhere | no forced redirects — free navigation |
| `loading` / `transitioning` | LoadingScreen overlay, no navigation |

**Key implementation decisions:**
- Stack always renders (never replaced by LoadingScreen) — required by Expo Router 6 which expects a navigator on every render of the Root Layout
- LoadingScreen is an `absoluteFillObject` overlay at `zIndex: 999`
- Guard is gated on `useRootNavigationState().key` to prevent the "navigate before mounting Root Layout" crash — this key is `undefined` until Expo Router's navigation container is fully ready
- `isRedirecting` ref + 500 ms cooldown prevents double-redirect loops on status flips

---

## 4. Theme system

**File:** `apps/mobile/src/theme/colors.ts`

Single source of truth for the entire color palette, matching the web's CSS variables.
Primary color aligned: **Savanna Orange `#f97316`** (web uses the same; mobile previously had amber `#f59e0b`).

All 30+ mobile files updated to use `colors.*` tokens — no hardcoded hex values remain in the codebase.

Key tokens: `colors.primary`, `colors.background`, `colors.surface`, `colors.border`, `colors.foreground`, `colors.textMuted`, `colors.textSubtle`, `colors.danger`, `colors.win`, `colors.rankGold/Silver/Bronze`, `colors.overlay`, `colors.primaryAlpha05/10/15`.

`tailwind.config.js` also extended with the same palette for utility class usage.

---

## 5. Screens implemented

### Auth screens

| Screen | File | Notes |
|---|---|---|
| Welcome / Onboarding | `app/welcome.tsx` | Login, Guest, Sign Up entry points |
| Login | `app/(auth)/login.tsx` | Remember-me via SecureStore, show/hide password, Google Sign-In button |
| Sign Up | `app/(auth)/signup.tsx` | 3-step: phone → OTP → details |

### App screens

| Screen | File | Data source |
|---|---|---|
| Home / Landing | `app/index.tsx` | Recent games from `/games/history?take=5` |
| Profile | `app/profile.tsx` | User from auth store |
| Notifications | `app/notifications.tsx` | `GET /notifications?limit=50` |
| Community | `app/community.tsx` | Static / planned |
| Support | `app/support.tsx` | Static |
| Settings | `app/settings.tsx` | Scaffolded |

### Game screens (UI complete, gameplay not yet wired)

| Screen | File | Data source |
|---|---|---|
| Play vs AI setup | `app/game/setup-ai.tsx` | Bot definitions (`src/lib/game/bots.ts`) |
| Play vs Friend setup | `app/game/setup-friend.tsx` | Static UI + `matchService` stubs |
| Online Lobby | `app/game/lobby.tsx` | UI only |
| Tournaments list | `app/game/tournaments.tsx` | `/tournaments` API |
| Tournament detail | `app/game/tournament/[id].tsx` | `/tournaments/:id` API |
| Game history | `app/game/history.tsx` | `/games/history` API |
| Leaderboard | `app/game/leaderboard.tsx` | `/leaderboard` API |

---

## 6. Components

| Component | File | Notes |
|---|---|---|
| Header | `src/components/Header.tsx` | Menu button, logo, notification bell with live unread badge, language switcher |
| SideMenu | `src/components/SideMenu.tsx` | Profile, navigation links, logout |
| ServiceCard | `src/components/ServiceCard.tsx` | Home screen action cards |
| MiniBoard | `src/components/MiniBoard.tsx` | Decorative board thumbnail |
| WelcomeBoard | `src/components/WelcomeBoard.tsx` | Animated board on welcome screen |
| LanguageSwitcher | `src/components/LanguageSwitcher.tsx` | EN/SW toggle |
| LoadingScreen | `src/components/ui/LoadingScreen.tsx` | Animated loading overlay |

---

## 7. Notifications

**Screen:** `app/notifications.tsx`

Full notification inbox screen:
- Fetches up to 50 notifications from `GET /notifications?limit=50`
- Sections: **New** (unread) / **Earlier** (read), with pull-to-refresh
- Mark individual notification read: `PATCH /notifications/:id/read`
- Mark all read: `PATCH /notifications/read-all` (with ActivityIndicator)
- Type-specific icons and accent colours (tournament registered/started/cancelled/completed, match assigned/started/result, round advanced, eliminated)
- Tapping a notification with `metadata.tournamentId` navigates to `/game/tournament/:id`
- Empty state with `BellOff` illustration

**Header badge:** `Header.tsx` polls `GET /notifications/unread-count` every 60 s and shows a live badge (capped at 9+). Optimistically clears to 0 when the user navigates to the notifications screen.

---

## 8. Services and lib

| File | Purpose |
|---|---|
| `src/lib/api.ts` | Axios instance, request interceptor (attach token), response interceptor (401 → refresh); dynamic host detection via `Constants.expoConfig.hostUri` for physical devices |
| `src/lib/auth-client.ts` | `AuthClient` class: `login`, `register`, `loginAsGuest`, `loginWithGoogle`, `sendOTP`, `verifyOTP`, `updateProfile`, `logout` |
| `src/lib/match-service.ts` | `createInviteGame`, `joinInviteGame` — stubbed, pending Phase 2 |
| `src/lib/history-service.ts` | `getHistory`, `getStats`, `getReplay` |
| `src/lib/tournament-service.ts` | `getTournaments`, `getTournamentById`, `joinTournament` |
| `src/lib/game/bots.ts` | All 19 bot profiles (name, elo, tier, description, image) |
| `src/auth/auth-store.ts` | Zustand store: user, token, status, isAuthenticated, hasHydrated |
| `src/hooks/useAuthInitializer.ts` | Runs `authClient.init()` after rehydration to sync with backend |

---

## 9. Dev tooling / environment

**File:** `apps/mobile/.env.development`

| Flag | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Override API base URL (defaults to dynamic host detection) |
| `EXPO_PUBLIC_SIMULATE_OFFLINE` | Simulate network failure in dev (throws on every request) |
| `EXPO_PUBLIC_MOCK_AUTH_ME_401` | Force 401 on `/auth/me` to test session rehydration resilience |

---

## 10. Backend additions (mobile-specific)

| Change | File | Detail |
|---|---|---|
| `GoogleMobileOAuthGuard` | `backend/src/auth/guards/google-oauth.guard.ts` | Separate guard for mobile OAuth; dynamic `callbackURL` resolves correct host IP on LAN for physical device testing; redirects to `tzdraft-mobile://auth/callback` deep link |
| Mobile OAuth endpoints wired | `backend/src/auth/auth.controller.ts` | `GET /auth/google/mobile` + `GET /auth/google/mobile-callback` |
| `findByIdentifier` | `backend/src/domain/user/user.service.ts` | Accepts phone number or username for login |

---

## 11. Known gaps carried into Phase 2

| Item | Phase |
|---|---|
| Actual game board (Play vs AI) | Phase 2 |
| Mkaguzi engine integration for mobile | Phase 2 |
| Online matchmaking (lobby WebSocket) | Phase 2 |
| Play vs Friend (invite code flow end-to-end) | Phase 2 |
| Profile editing form | Phase 2 |
| Settings screen content | Phase 2 |
| `match-service.ts` broken import (`shared/constants/game.constants` missing) | Phase 2 fix |
| Push notifications (FCM/APNs) | Phase 3 |
| Voice chat | Phase 3 |
| EAS build pipeline | Phase 4 |
