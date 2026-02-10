# Formal Tanzania Drafti Rule Specification
## Official Rules for 8×8 Tanzania Drafti (Drafti Platform)

---

## 1. Purpose of This Document

This document defines the **official, authoritative rules** for **Tanzania Drafti (8×8)** as implemented in the Drafti platform.

These rules are:
- Deterministic
- Server-enforced
- Engine-compatible
- Suitable for competitive and casual play

This specification is the **single source of truth** for:
- Game logic implementation
- Bot engine integration
- Match validation
- Replays and ratings

---

## 2. Game Overview

- **Game type**: Draughts / Checkers variant
- **Board size**: 8×8
- **Players**: 2
- **Colors**: Black and White
- **Initial pieces per player**: 12
- **Turn order**: White moves first

---

## 3. Board Definition

### 3.1 Board Layout

- The board consists of **64 squares** arranged in 8 rows and 8 columns
- Only **dark squares** are playable
- Each player occupies the dark squares of the first three rows on their side

### 3.2 Coordinate System (Logical)

- Rows: 1–8
- Columns: A–H
- Only dark-square coordinates are valid
- UI displays ranks 1-8 and files A-H to describe moves clearly

---

## 4. Pieces

### 4.1 Man (Normal Piece)

- Moves diagonally forward by one square
- Captures diagonally by jumping over an opponent’s piece

### 4.2 King

- Created when a Man reaches the opponent’s back row
- Kings are **flying**: they can move diagonally **any number of squares**\r\n- Kings can capture diagonally forward and backward over distance

---

## 5. Turn Structure

1. A player must make exactly **one move per turn**
2. If a capture is available, **a capture is mandatory**
3. If multiple capture sequences are available, the player must choose **one valid sequence**

---

## 6. Movement Rules

### 6.1 Man Movement

- Moves one square diagonally forward
- Cannot move backward unless promoted to King

### 6.2 King Movement

- Moves diagonally **any number of squares** in any direction (flying kings)

---

## 7. Capture Rules (Mandatory)

### 7.1 Basic Capture

- A capture occurs when a piece jumps diagonally over an adjacent opponent piece
- The landing square must be empty
- The captured piece is removed after the jump

### 7.2 Multiple Captures

- If after a capture, another capture is available with the same piece, the player **must continue capturing**
- Multiple captures occur in a single turn

### 7.3 Capture Priority

- Captures are mandatory
- There is **no obligation to choose the maximum number of captures**

---

## 8. Promotion (Kinging)

- A Man is promoted to King **immediately upon reaching the opponent’s back row**
- If promotion occurs during a capture sequence, the move **ends immediately**

---

## 9. Illegal Moves

A move is illegal if:
- It violates movement rules
- It ignores a mandatory capture
- It attempts to move onto an occupied square
- It moves a piece outside the board

Illegal moves are rejected by the server.

---

## 10. Game End Conditions

### 10.1 Win

A player wins if the opponent:
- Has no remaining pieces
- Has no legal moves available

### 10.2 Draw

A game is drawn if:
- Both players agree to a draw
- The same position repeats three times
- A defined move-limit without capture or promotion is reached

---

## 11. Time Control (Platform Rule)

- Each game may use a clock
- If a player’s time expires, that player **loses the game**

---

## 12. Rating Implications

- Rated games affect player ratings
- Unrated games do not affect ratings
- Bot games may use separate rating pools

---

## 13. Server Authority Rules

- The server is the **single authority** on game state
- Clients only submit move intentions
- All validation is server-side
- Engine-generated moves are validated identically to player moves

---

## 14. Engine Compatibility Rules

- Engine must follow this rule set
- Engine moves are validated before application
- Any invalid engine move is rejected

---

## 15. Rule Versioning

- This document defines **Drafti Rules v1.0**
- Any future changes must increment version number
- Games store rule version used at creation

---

## 16. Conclusion

This specification defines the **official Tanzania Drafti (8×8) ruleset** for the Drafti platform.

All implementations—human or computer—must comply strictly with this document.

---

**This document is authoritative and binding for all Drafti gameplay systems.**



