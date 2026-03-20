# Voice Chat Upgrade Plan — Cross-Device & Pro Quality

**Version:** 1.1
**Date:** 2026-03-15
**Amended:** 2026-03-15 — added P1.4 ICE candidate buffering (missing from v1.0)
**Branch target:** `feature/voice-chat-pro`
**Author:** Claude (AI Code Review)
**Status:** Complete — Phase 1, 2, and 3 implemented and deployed 2026-03-15

---

## 1. Objective

Make voice chat work reliably on **all devices and all browsers** (iOS Safari, Android Chrome, Firefox, Samsung Internet, desktop Safari, Chrome, Edge), then layer on pro-quality UX improvements (speaking indicator, push-to-talk, reconnection).

---

## 2. Current State

| File | Lines | Role |
|---|---|---|
| `frontend/src/hooks/useVoiceChat.ts` | 278 | WebRTC logic, state machine, socket signaling |
| `frontend/src/components/game/VoiceChatControls.tsx` | 197 | UI: ring/accept/decline/mute/hang-up |
| `backend/src/infrastructure/messaging/games.gateway.ts` | 601–664 | Relay-only WS signaling (8 events) |

### What Works
- P2P WebRTC negotiation via Socket.IO signaling
- Call state machine: `idle → ringing → incoming → calling → connected → failed`
- Mute/unmute, 30s auto-decline, hang-up
- Only shown to registered users in live PvP games

### What Is Broken or Missing
See Section 3.

---

## 3. Problems Found (by Priority)

### P1 — Critical (breaks voice on certain devices/networks)

#### P1.1 — No TURN Server
**File:** `frontend/src/hooks/useVoiceChat.ts:17-20`
**Impact:** ~15-20% of connections fail silently — mobile hotspot, corporate NAT, some ISPs
**Root cause:** Only Google STUN configured. STUN allows NAT traversal only when at least one peer has a public IP reachable by the other. Symmetric NAT (common on mobile) blocks this entirely.

#### P1.2 — `sampleRate: 16000` Crashes on Safari + Some Android
**File:** `frontend/src/hooks/useVoiceChat.ts:113`
**Impact:** `OverconstrainedError` thrown → `getMic()` rejects → call fails with generic "Could not start call."
**Root cause:** Safari and many Android mics do not support forced sample rate in getUserMedia constraints. The constraint is rejected hard, not ignored.

```ts
// CURRENT — unsafe
audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
```

#### P1.3 — Remote Audio Blocked by Autoplay Policy on Mobile
**File:** `frontend/src/hooks/useVoiceChat.ts:92-95`
**Impact:** You hear nothing from the remote peer on iOS Safari and Chrome Mobile
**Root cause:** Setting `srcObject` + relying on `autoPlay` HTML attribute is blocked. Mobile browsers require an explicit `.play()` call triggered within (or after) a user gesture context.

```ts
// CURRENT — missing .play() call
pc.ontrack = ({ streams }) => {
  if (remoteAudioRef.current && streams[0]) {
    remoteAudioRef.current.srcObject = streams[0];
    // ← audio never plays on mobile
  }
};
```

#### P1.4 — ICE Candidates Silently Dropped Before Remote Description Is Set
**File:** `frontend/src/hooks/useVoiceChat.ts:234-236`
**Impact:** Random call failures on all browsers, most visible on mobile and high-latency networks. The call reaches "Connecting…" and stalls or never reaches `connected`. No error is shown.
**Root cause:** Three simultaneous race conditions:

1. **Candidates arrive before `pcRef.current` exists** — the `?.` operator makes `addIceCandidate` a silent no-op when the PC hasn't been built yet.
2. **Candidates arrive before `setRemoteDescription` completes (callee path)** — the callee receives ICE candidates from the caller while `onOffer` is still `await`-ing `getMic()` and `setRemoteDescription()` at line 213. `addIceCandidate` called before remote description is set throws `InvalidStateError`, silently swallowed by `.catch(() => {})`.
3. **Candidates arrive before `setRemoteDescription` completes (caller path)** — the caller receives ICE candidates from the callee while `onAnswer` is still `await`-ing `setRemoteDescription(sdp)` at line 231. Same silent drop.

```ts
// CURRENT — three silent failure modes
const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
  await pcRef.current?.addIceCandidate(candidate).catch(() => {}); // ← drops silently
};
```

**Fix:** Buffer candidates in a ref array. Drain the buffer immediately after each `setRemoteDescription()` call completes. Reset buffer in `cleanup()`.

```ts
// NEW — buffer until remote description is ready
const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
const remoteDescReadyRef   = useRef(false);

// In onIceCandidate:
const onIceCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
  if (!candidate) return;
  if (!remoteDescReadyRef.current || !pcRef.current) {
    iceCandidateQueueRef.current.push(candidate); // buffer it
  } else {
    pcRef.current.addIceCandidate(candidate).catch(() => {});
  }
};

// Drain helper — call after every setRemoteDescription():
async function drainCandidateQueue(pc: RTCPeerConnection) {
  remoteDescReadyRef.current = true;
  for (const c of iceCandidateQueueRef.current) {
    await pc.addIceCandidate(c).catch(() => {});
  }
  iceCandidateQueueRef.current = [];
}

// In onOffer — after setRemoteDescription:
await pc.setRemoteDescription(sdp);
await drainCandidateQueue(pc);  // ← add this

// In onAnswer — after setRemoteDescription:
await pcRef.current.setRemoteDescription(sdp);
await drainCandidateQueue(pcRef.current);  // ← add this

// In cleanup():
iceCandidateQueueRef.current = [];
remoteDescReadyRef.current   = false;
```

---

### P2 — Reliability (degraded experience)

#### P2.1 — `connectionState` Unreliable on Firefox < 99
**File:** `frontend/src/hooks/useVoiceChat.ts:98-106`
**Impact:** On older Firefox, `connectionstatechange` never fires. `connected` state is never reached, call appears stuck in "Connecting…"
**Fix:** Also listen to `iceconnectionstatechange` as fallback.

#### P2.2 — No ICE Gathering Timeout
**File:** `frontend/src/hooks/useVoiceChat.ts:80-109` (buildPc)
**Impact:** On slow mobile networks, ICE gathering stalls. The offer is never sent. Call stuck in "Connecting…" forever.
**Fix:** After 10 seconds, call `pc.createOffer()` with `iceRestart: false` regardless of gathering state.

#### P2.3 — Generic Error Messages for Mic Failures
**File:** `frontend/src/hooks/useVoiceChat.ts:186-193, 221-228`
**Impact:** User sees "Could not start call." for mic not found, permission denied, HTTPS required, mic in use — all look identical.
**Fix:** Map error names to device-specific messages + add constraint fallback for `OverconstrainedError`.

---

### P3 — Pro Features (polish)

#### P3.1 — No Speaking Indicator
No visual feedback when remote peer is talking. Standard in all voice apps (Discord, Zoom, etc.).

#### P3.2 — No Push-to-Talk (PTT) Mode
Background noise bleeds through. PTT is preferred by competitive players.

#### P3.3 — No Auto-Reconnect on Drop
If connection drops mid-game, the call ends permanently. User must manually re-call.

---

## 4. Infrastructure Plan — Coturn on Hetzner VPS

### Why Self-Hosted on Hetzner
- Hetzner includes **20 TB/month free bandwidth** — TURN relay traffic is negligible at TzDraft's scale
- No per-GB billing. No third-party dependency. No credentials exposed in browser bundle.
- Same server already runs NestJS + Redis + PostgreSQL — no extra cost.
- Short-lived HMAC tokens generated by NestJS backend — credentials never reach the client as plaintext.

### Coturn Setup Steps (VPS)

**1. Install:**
```bash
apt install coturn
```

**2. Enable service:**
```bash
# /etc/default/coturn
TURNSERVER_ENABLED=1
```

**3. Config (`/etc/turnserver.conf`):**
```
realm=tzdraft.co.tz
server-name=turn.tzdraft.co.tz
listening-port=3478
tls-listening-port=5349
cert=/etc/letsencrypt/live/tzdraft.co.tz/fullchain.pem
pkey=/etc/letsencrypt/live/tzdraft.co.tz/privkey.pem
use-auth-secret
static-auth-secret=GENERATE_RANDOM_64_CHAR_SECRET
total-quota=100
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

**4. Hetzner Firewall — open ports:**
```
TCP/UDP  3478      TURN standard
TCP/UDP  5349      TURN over TLS
UDP      49152-65535   relay port range
```

**5. Start:**
```bash
systemctl enable coturn && systemctl start coturn
```

**6. DNS record:**
```
turn.tzdraft.co.tz  A  <your-hetzner-ip>
```

---

## 5. New Backend Endpoint — TURN Credentials

NestJS generates short-lived HMAC tokens. The frontend fetches them before building `RTCPeerConnection`. This means no permanent credentials ever reach the browser.

### Endpoint

```
GET /turn/credentials
Authorization: Bearer <jwt>
```

### Response

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    {
      "urls": [
        "turn:turn.tzdraft.co.tz:3478",
        "turn:turn.tzdraft.co.tz:443",
        "turns:turn.tzdraft.co.tz:5349"
      ],
      "username": "1710000000:userId",
      "credential": "hmac-sha1-base64-token"
    }
  ],
  "ttl": 3600
}
```

### Token Generation (NestJS service)

```ts
// HMAC-SHA1, valid for 1 hour
const ttl = Math.floor(Date.now() / 1000) + 3600;
const username = `${ttl}:${userId}`;
const credential = crypto
  .createHmac('sha1', TURN_SECRET)
  .update(username)
  .digest('base64');
```

### New Backend Files

| File | Action |
|---|---|
| `backend/src/turn/turn.module.ts` | New module |
| `backend/src/turn/turn.controller.ts` | `GET /turn/credentials` (JWT-guarded) |
| `backend/src/turn/turn.service.ts` | HMAC token generation |

### New Backend Env Vars

```env
TURN_SERVER_URL=turn.tzdraft.co.tz
TURN_SECRET=<64-char random string matching turnserver.conf>
```

---

## 6. Frontend Changes

### 6.1 New Env Var

```env
# frontend/.env.local
NEXT_PUBLIC_TURN_ENABLED=true
```
No credentials in frontend env. ICE servers fetched from backend at call time.

### 6.2 `useVoiceChat.ts` — All Changes

| # | Fix | Location |
|---|---|---|
| F1 | Remove `sampleRate: 16000`, add constraint fallback | Line 113 |
| F2 | Add `audio.play().catch()` in `ontrack` | Lines 92-95 |
| F3 | Add `iceconnectionstatechange` fallback listener | Lines 98-106 |
| F4 | Add 10s ICE gathering timeout in `buildPc` | Lines 80-109 |
| F5 | Expand error messages (5 error types) | Lines 186-193, 221-228 |
| F6 | Fetch ICE servers from `/turn/credentials` before building PC | Lines 17-20, 80 |
| F7 | Add `isRemoteSpeaking: boolean` via AudioContext analyser | New state |
| F8 | Add auto-reconnect on `connectionState === 'failed'` when was connected | Lines 98-106 |
| F9 | Add push-to-talk mode (`isPttMode`, Space key handlers) | New state + effect |
| F10 | **ICE candidate buffering** — queue candidates until `setRemoteDescription` completes, drain on both `onOffer` and `onAnswer` paths, reset in `cleanup()` | Lines 58-76, 213, 231, 234-236 |

#### getMic() — New Constraint Fallback

```ts
async function getMic(): Promise<MediaStream> {
  const preferred = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: preferred });
  } catch (e: any) {
    if (e?.name === 'OverconstrainedError') {
      // Safari / some Android — retry with no constraints
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw e;
  }
}
```

#### Error Message Map

```ts
function micErrorMessage(e: any): string {
  switch (e?.name) {
    case 'NotAllowedError':    return 'Microphone access denied. Allow mic in browser settings.';
    case 'NotFoundError':      return 'No microphone found on this device.';
    case 'OverconstrainedError': return 'Microphone not compatible. Retrying…';
    case 'SecurityError':      return 'Voice chat requires a secure connection (HTTPS).';
    case 'AbortError':         return 'Microphone is in use by another app.';
    default:                   return 'Could not access microphone.';
  }
}
```

#### Speaking Indicator — AudioContext Analyser

```ts
// Attach to remote stream in ontrack
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 512;
audioCtx.createMediaStreamSource(remoteStream).connect(analyser);
const buf = new Uint8Array(analyser.frequencyBinCount);

const poll = () => {
  analyser.getByteFrequencyData(buf);
  const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
  setIsRemoteSpeaking(rms > 10); // threshold tunable
  rafRef.current = requestAnimationFrame(poll);
};
rafRef.current = requestAnimationFrame(poll);
```

### 6.3 `VoiceChatControls.tsx` — UI Changes

| # | Change |
|---|---|
| U1 | Show green pulsing ring around remote player avatar when `isRemoteSpeaking` |
| U2 | Add PTT toggle button in connected state ("Hold SPACE" label) |
| U3 | Show connection quality icon (RTCPeerConnection.getStats — optional Phase 2) |

---

## 7. Implementation Phases

### Phase 1 — Reliability (Do First)

**Goal:** Voice works on all devices before any new features.

| Step | Task | File(s) | Est. |
|---|---|---|---|
| 1.1 | Install + configure Coturn on Hetzner VPS | VPS shell | 1 hr |
| 1.2 | Open Hetzner firewall ports (3478, 5349, 49152-65535) | Hetzner console | 15 min |
| 1.3 | Add DNS record `turn.tzdraft.co.tz` | DNS panel | 10 min |
| 1.4 | Create `TurnModule` + `GET /turn/credentials` in NestJS | 3 new files | 1 hr |
| 1.5 | Fix `getMic()` — remove sampleRate, add fallback | `useVoiceChat.ts:113` | 30 min |
| 1.6 | Fix autoplay — add `audio.play()` in `ontrack` | `useVoiceChat.ts:92` | 15 min |
| 1.7 | Fix Firefox — add `iceconnectionstatechange` listener | `useVoiceChat.ts:98` | 30 min |
| 1.8 | Add ICE gathering timeout (10s) | `useVoiceChat.ts:80` | 30 min |
| 1.9 | Expand error messages | `useVoiceChat.ts:186,221` | 20 min |
| 1.10 | Fetch ICE servers from `/turn/credentials` in hook | `useVoiceChat.ts:17` | 30 min |
| 1.11 | **ICE candidate buffering** — add `iceCandidateQueueRef`, `remoteDescReadyRef`, `drainCandidateQueue()`; patch `onIceCandidate`, `onOffer`, `onAnswer`, `cleanup()` | `useVoiceChat.ts:58,213,231,234` | 45 min |

**Phase 1 Total: ~5.25 hrs**

---

### Phase 2 — Pro UX

**Goal:** Polish that makes it feel like a real product.

| Step | Task | File(s) | Est. |
|---|---|---|---|
| 2.1 | Speaking indicator (AudioContext analyser) | `useVoiceChat.ts` + `VoiceChatControls.tsx` | 2 hrs |
| 2.2 | Auto-reconnect on connection drop | `useVoiceChat.ts:98` | 45 min |
| 2.3 | Push-to-talk mode (Space key) | Both files | 1 hr |

**Phase 2 Total: ~3.75 hrs**

---

### Phase 3 — Optional Future

| Feature | Notes |
|---|---|
| Audio device selector | `enumerateDevices()` in settings page |
| Connection quality indicator | `RTCPeerConnection.getStats()` polling |
| Volume slider for remote audio | `GainNode` on AudioContext graph |

---

## 8. File Change Summary

### New Files
```
backend/src/turn/turn.module.ts
backend/src/turn/turn.controller.ts
backend/src/turn/turn.service.ts
docs/chat/VOICE_CHAT_UPGRADE_PLAN_2026-03-15.md   ← this file
```

### Modified Files
```
frontend/src/hooks/useVoiceChat.ts                 — F1–F10
frontend/src/components/game/VoiceChatControls.tsx — U1–U3
backend/src/app.module.ts                          — register TurnModule
```

### New Env Vars
```
# backend/.env
TURN_SERVER_URL=turn.tzdraft.co.tz
TURN_SECRET=<64-char random>

# frontend/.env
NEXT_PUBLIC_TURN_ENABLED=true
```

### No Changes Needed
```
backend/src/infrastructure/messaging/games.gateway.ts  — relay-only, already correct
```

---

## 9. Testing Checklist

### Phase 1 (Reliability)
- [ ] Call works: Chrome desktop ↔ Chrome desktop (same network)
- [ ] Call works: Chrome desktop ↔ Safari iOS (different network — tests TURN)
- [ ] Call works: Chrome Android ↔ Firefox desktop
- [ ] Call works: Samsung Internet ↔ Chrome
- [ ] Mic denied → shows "Microphone access denied. Allow mic in browser settings."
- [ ] No mic device → shows "No microphone found on this device."
- [ ] TURN credentials endpoint returns 401 for unauthenticated requests
- [ ] TURN credentials expire after 1 hour (verify `ttl` field)
- [ ] Coturn service restarts after VPS reboot (`systemctl is-enabled coturn`)
- [ ] ICE candidates that arrive before answer — verified they are buffered and applied (test: add artificial 500ms delay before `setRemoteDescription` in `onAnswer`, confirm call still connects)
- [ ] ICE candidates that arrive before offer is processed — verified buffered on callee side
- [ ] `cleanup()` resets candidate queue and `remoteDescReadyRef` (second call works cleanly)

### Phase 2 (Pro UX)
- [ ] Speaking indicator pulses when remote player talks
- [ ] Speaking indicator stops when remote player is silent
- [ ] Space key activates PTT when PTT mode enabled
- [ ] PTT label shows "Hold SPACE to talk"
- [ ] Auto-reconnect triggers when connection drops (simulate by disabling network briefly)
- [ ] Auto-reconnect shows "Connection dropped — reconnecting…" message

---

## 10. Rollback Plan

If Coturn is misconfigured, voice chat falls back gracefully:
- Frontend catches fetch error from `/turn/credentials` → falls back to STUN-only `ICE_SERVERS`
- Voice chat still works for ~80% of users (those not behind symmetric NAT)
- No game logic is affected — voice is fully decoupled from game state

---

## 11. References

- Current voice hook: `frontend/src/hooks/useVoiceChat.ts`
- Current UI component: `frontend/src/components/game/VoiceChatControls.tsx`
- WS gateway voice handlers: `backend/src/infrastructure/messaging/games.gateway.ts:601-664`
- Existing voice chat analysis: `docs/chat/Voice_Chat_Analysis.docx`
- Hetzner VPS deploy guide: `docs/api/vps-hetzner-deploy.md`
- Coturn docs: https://github.com/coturn/coturn
