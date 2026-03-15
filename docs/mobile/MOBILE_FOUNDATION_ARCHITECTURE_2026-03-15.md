# TzDraft Mobile Foundation Architecture

Date: 2026-03-15
Status: Ready for implementation

## Decisions

- Mobile app lives in `apps/mobile`.
- Shared API, auth, and socket contracts live in `packages/shared-client`.
- Sensitive session data is stored in `expo-secure-store`, not browser storage.
- Mobile navigation uses Expo Router route groups:
  - `(auth)` for login/signup/OTP/OAuth entry
  - `(app)` for authenticated tabs and future nested stacks
- API access is created through a mobile-specific Axios client with refresh-token retry.
- Realtime uses a dedicated mobile socket factory with typed events.

## Boundaries

### Keep in `packages/shared-client`

- DTOs and validation schemas
- Endpoint constants
- Socket event typings
- Any cross-platform client contracts that should stay identical on web and mobile

### Keep in `apps/mobile`

- Navigation
- Secure storage
- Native auth flows, deep links, and device permissions
- React Native UI and gesture behavior
- App lifecycle handling for foreground/background reconnects

### Refactor out of `frontend`

- Browser-specific token handling
- API wrappers that assume `window`, `localStorage`, or Next.js routing
- Socket setup that assumes a browser runtime

## Immediate implementation order

1. Move current auth request/response types to shared contracts and update web to consume them.
2. Build mobile login, OTP, and session refresh flows on top of the new mobile store.
3. Extract game API methods into shared client services or shared contract-first wrappers.
4. Port local game mode first, then online sync and reconnect handling.

## Non-goals for this foundation pass

- Full mobile feature parity
- Voice chat
- Push notifications
- Store release setup
