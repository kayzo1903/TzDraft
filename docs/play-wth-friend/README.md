# Play With Friend - System Overview

## Summary
This document explains how the Play With Friend system works end-to-end.

## Actors
- Host: the user who sends a challenge
- Guest: the user who receives and accepts the challenge
- Invite: a FriendlyMatch record that links host and guest and provides a waiting room

## Flow
### 1) Host sends a challenge
1. Host clicks **Challenge** on the Friends page.
2. Frontend calls `POST /friends/matches`.
3. Backend creates:
   - a WAITING game (no timer running yet)
   - a FriendlyMatch invite record with `inviteId` + `inviteToken`
4. Host is redirected to `/game/friendly/wait/:inviteId`.

### 2) Guest receives the challenge
- If online: backend emits `friendlyMatchInvited` via WebSocket to the guest.
- If offline: the guest will see the invite via polling when they reconnect.

### 3) Guest accepts
- Accept can happen from:
  - the notification (auto-accept for logged-in users), or
  - the Friends page list
- Backend marks invite as `ACCEPTED` and attaches the guest.
- Guest is redirected to `/game/friendly/wait/:inviteId`.

### 4) Waiting room
- Both users join the `waitroom-<inviteId>` socket room.
- Host sees **Start Game** when the guest is present.
- Host clicks **Start Game** to activate the match.

### 5) Game start
- Backend activates the game (status `ACTIVE`).
- Both clients navigate to `/game/:gameId`.

### 6) Decline flow
- Guest declines invite -> invite status becomes `DECLINED`.
- Host in the waiting room receives `friendlyInviteDeclined` immediately.

## Key API routes
- `POST /friends/matches` - create invite
- `GET /friends/matches/incoming` - list incoming invites
- `POST /friends/matches/invites/:token/accept` - accept invite
- `POST /friends/matches/:id/decline` - decline invite
- `POST /friends/matches/:id/cancel` - cancel invite

## Key socket events
- `friendlyMatchInvited` - guest notified of a direct challenge
- `friendlyInviteOpponentJoined` - host notified guest joined
- `friendlyInviteDeclined` - host notified guest declined
- `waitingRoomPresence` - waiting room presence updates
- `gameActivated` - game is activated and both clients should navigate

## Known failure modes
- Socket disconnected when invite is sent -> popup delayed until polling.
- Invite expires without cleanup -> can block new challenges if linked WAITING game persists.

## Notes
- Host always starts the match in the waiting room.
- Both host and guest must be in the waiting room before the game can start.
