# TzDraft Social System - v1.0.0

This document outlines the Hybrid Social System for TzDraft, designed to balance platform growth with an "Exclusive Rivalry" feel.

## 1. Relationship Hierarchy

| Level | Requirement | Benefits/Permissions |
|---|---|---|
| **Follower** | One-way connection. | Can see public history; can find you via search to spectate. |
| **Following** | You follow them. | They appear in your "Following" list; you get notified of their live games in UI. |
| **Friend** | **Mutual Follow** + **Must have played >= 1 game.** | **Homepage Priority:** Direct challenge buttons; instant "Online" alerts (High Priority). |
| **Rival** | **Friend** + **Must have played >= 10 games.** | **Prestige Badge:** "Rival" status displayed on profile and game headers. |

## 2. Interaction Logic

### 2.1 The "Friend Request" Funnel
To preserve the "Exclusive Rivalry" feel, friendships are earned through action:
1. **The Lead:** You follow a player from the **Leaderboard** or **Game History** using the `(+)` button.
2. **The Request:** If you have played against them, this action is visually treated as a "Friend Request".
3. **The Acceptance:** If the opponent follows you back, the friendship is officially established (provided at least 1 game has been played).
4. **Fallback:** If they don't follow back, or you haven't played, you remain a "Follower".

## 3. Technical Implementation

### 3.1 Data Model (Prisma)
The system uses a simple, high-performance `Follow` model. Friend and Rival statuses are derived from relationship counts and game history.

```prisma
model Follow {
    id          String   @id @default(uuid())
    followerId  String   @map("follower_id")
    followingId String   @map("following_id")
    createdAt   DateTime @default(now()) @map("created_at")

    follower    User @relation("Following", fields: [followerId], references: [id])
    following   User @relation("Followers", fields: [followingId], references: [id])

    @@unique([followerId, followingId])
}
```

### 3.2 Key Endpoints
*   `POST /social/follow/:username`: Toggles follow state.
*   `GET /social/stats`: Aggregates followers, following, and friend counts.
*   `GET /social/friends`: Returns the derived list of active friends and rivals.

## 4. UI/UX Architecture

### 4.1 Instagram-Style Profile
The user profile is designed for high-density information with a premium social feel:
*   **Header Row:** Avatar (Left) | Stats Matrix (Right: Friends, Followers, Following).
*   **Identity Stack:** `DisplayName @username` at the top, followed by the **Blitz ELO Badge**.
*   **Main View:** Automatically shows a **Friends List** with online status and direct challenge buttons.
*   **Navigation:** Settings are tucked into a dedicated page accessible via the top-right gear icon.

### 4.2 Discovery & History
*   **Leaderboard:** Each rank entry features a quick-follow button.
*   **Game History:** Every human match features a "Follow/Request" button to quickly convert opponents into friends.
*   **Community Hub:** Centralized management of Followers, Following, and Mutual Friends.

### 4.3 Homepage
*   **Friends Online:** A horizontal scroll of active friends for immediate engagement.

## 5. System Limits
*   **Friend Cap:** 100 mutual friends to maintain exclusivity and prevent notification fatigue.
*   **Followers:** Unlimited, allowing top players to build public influence.

---
*Last Updated: 2026-04-23*
*Status: Implemented/v1.0.0*
