# Drafti Frontend Plan
## Chess.com–Inspired Clean Board & UI Architecture

---

## 1. Goal of the Frontend
The goal of the Drafti frontend is to deliver a **clean, smooth, competitive draughts experience** inspired by chess.com, while keeping the identity uniquely Drafti.

Key principles:
- Minimal UI, zero clutter
- Board-first experience
- Fast interactions (no lag feeling)
- Competitive and social-ready

---

## 2. Design Philosophy (Chess.com Inspiration)

### What We Take from Chess.com
- Center-focused board layout
- Soft neutral background
- High-contrast board squares
- Clear piece visibility
- Subtle animations (not flashy)
- Information panels that do not distract from the board

### What We Avoid
- Overcrowded sidebars
- Loud colors
- Heavy gradients
- Too many buttons on screen

Drafti should feel **professional, calm, and competitive**.

---

## 3. Layout Structure

### Desktop Layout
```
┌─────────────────────────────────────────────┐
│ Top Bar (Logo · Play · Profile · Settings) │
├───────────────┬─────────────────────────────┤
│ Player Panel  │                             │
│ (Opponent)    │         Game Board          │
│               │                             │
├───────────────┼─────────────────────────────┤
│ Player Panel  │ Move History / Chat (opt)   │
│ (You)         │                             │
└───────────────┴─────────────────────────────┘
```

### Mobile Layout
- Board fills most of the screen
- Player info collapses into top/bottom bars
- Move history opens as a modal

---

## 4. Game Board Design

### Board Style
- 8×8 grid (draught standard)
- Colors:
  - Light squares: #F0D9B5 (soft beige)
  - Dark squares: #B58863 (warm brown)
- Rounded outer corners (subtle)
- Soft shadow for depth

### Interaction Rules
- Hover highlights possible moves
- Active piece gets a soft glow
- Capture squares highlighted clearly
- Invalid moves are blocked visually

### Animation Guidelines
- Pieces slide smoothly between squares
- Capture animation fades piece out
- Promotion animation slightly scales piece

Animations must be **fast and subtle**.

---

## 5. Pieces Design

### Style
- Flat but slightly shaded (modern)
- Clear distinction between players
- Kings visually distinct (crown or double ring)

### Accessibility
- Colorblind-safe contrast
- Optional alternative piece themes (future)

---

## 6. Player Panels

Each player panel shows:
- Avatar
- Username
- Rating
- Timer (most important visual element)

Timer behavior:
- Normal: neutral color
- <10 seconds: turns orange
- <5 seconds: turns red + pulse animation

---

## 7. Game Information Elements

### Move History
- Simple numbered list
- Auto-scroll to latest move
- Toggle show/hide

### Game Status
- "Your Turn"
- "Waiting for Opponent"
- "Check Capture Available"

Displayed subtly above or below the board.

---

## 8. Colors & Typography

### Colors
- Background: #2B2B2B or #1F1F1F
- Text: soft white (#EDEDED)
- Accent: Drafti brand color (used sparingly)

### Fonts
- Primary: Inter / Roboto
- Board labels: slightly heavier weight

Typography must remain readable at small sizes.

---

## 9. State Management Strategy

Frontend state handles:
- Selected piece
- Possible moves
- Timers (display only)
- Connection status

Backend handles:
- Move validation
- Game rules
- Match results
- Ratings

Frontend never decides legality of moves.

---

## 10. Realtime Behavior

- WebSocket connection opens on game load
- All moves streamed from backend
- Optimistic UI disabled (wait for server confirmation)
- Connection loss shows overlay (Reconnect / Forfeit)

---

## 11. Folder Structure (Next.js)

```
/app
  /game/[id]
    page.tsx
    GameBoard.tsx
    PlayerPanel.tsx
    MoveHistory.tsx
/components
  Board
  Pieces
  UI
/store
  gameStore.ts
/styles
  board.css
```

---

## 12. MVP Scope

Included:
- Online multiplayer
- Clean board UI
- Timers
- Win / lose screen

Excluded (Phase 2):
- Spectator mode
- Advanced themes
- Analysis board
- Tournaments

---

## 13. Success Criteria

Drafti frontend is successful if:
- Board is readable in under 1 second
- Moves feel instant and smooth
- New players understand the UI without instructions
- The board remains the visual focus at all times

---

End of Document

