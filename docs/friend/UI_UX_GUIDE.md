# Friend Page - UI/UX Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  TzDraft Logo    Play    Support        [User Menu ▼]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  👥 Friends                                              │
│  Manage your friendships and connect with other players │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ LEFT (1/3)         │  RIGHT (2/3)               │  │
│  │                    │                            │  │
│  │ Find Friends       │  🔔 Friend Requests (2)   │  │
│  │ ────────────────   │  ────────────────────────  │  │
│  │                    │                            │  │
│  │ [Search box.....] │  ┌──────────────────────┐  │  │
│  │ 🔍 username...    │  │ User 1               │  │  │
│  │                    │  │ @username1           │  │  │
│  │ [Send Request >]   │  │ Rating: 1450         │  │  │
│  │                    │  │ [✓] [✗]              │  │  │
│  │                    │  └──────────────────────┘  │  │
│  │                    │                            │  │
│  │                    │  ┌──────────────────────┐  │  │
│  │                    │  │ User 2               │  │  │
│  │                    │  │ @username2           │  │  │
│  │                    │  │ Rating: 1350         │  │  │
│  │                    │  │ [✓] [✗]              │  │  │
│  │                    │  └──────────────────────┘  │  │
│  │                    │                            │  │
│  │                    │  My Friends (3)            │  │
│  │                    │  ────────────────────      │  │
│  │                    │                            │  │
│  │                    │  ┌──────────────────────┐  │  │
│  │                    │  │ Friend 1             │  │  │
│  │                    │  │ @friend1             │  │  │
│  │                    │  │ Rating: 1500         │  │  │
│  │                    │  │                [🗑]  │  │  │
│  │                    │  └──────────────────────┘  │  │
│  │                    │                            │  │
│  │                    │  ┌──────────────────────┐  │  │
│  │                    │  │ Friend 2             │  │  │
│  │                    │  │ @friend2             │  │  │
│  │                    │  │ Rating: 1420         │  │  │
│  │                    │  │                [🗑]  │  │  │
│  │                    │  └──────────────────────┘  │  │
│  │                    │                            │  │
│  │                    │  ┌──────────────────────┐  │  │
│  │                    │  │ Friend 3             │  │  │
│  │                    │  │ @friend3             │  │  │
│  │                    │  │ Rating: 1380         │  │  │
│  │                    │  │                [🗑]  │  │  │
│  │                    │  └──────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Component Descriptions

### Find Friends (Left Panel)

**Search Input**
```
┌─────────────────────────────────┐
│ 🔍 Search by username...        │
└─────────────────────────────────┘
```
- Placeholder text guides user
- Search icon on the left
- Clear and dark focused effects

**Send Button**
```
┌─────────────────────────────────┐
│  👥  Send Friend Request        │
└─────────────────────────────────┘
```
- Large blue button
- Icon + text
- Hover effect (darker blue)
- Loading state with spinner
- Disabled during submission

**Messages**
```
✅ Friend request sent successfully!
(Auto-dismisses after 3 seconds)

❌ Failed to send friend request
Could not find this user.
```

### Friend Requests (Top Right)

**Header**
```
🔔 Friend Requests (2)
```
- Shows count of pending requests
- Updates dynamically

**Request Cards** (Blue background)
```
┌─────────────────────────────────┐
│ displayName                     │
│ @username                       │
│ Rating: 1450                    │
│            [✓]  [✗]             │
└─────────────────────────────────┘
```
- Light blue background
- User info clearly displayed
- Two action buttons side-by-side
- Accept (green) and Reject (red)
- Loading spinner on responding

**Empty State**
```
(No pending requests section shown)
```
- Section hidden when no requests

### My Friends (Bottom Right)

**Header**
```
👥 My Friends (N)
```
- Shows total count
- Updates on add/remove

**Friend Cards** (Gray background)
```
┌─────────────────────────────────┐
│ displayName                     │
│ @username                       │
│ Rating: 1500                    │
│                             [🗑] │
└─────────────────────────────────┘
```
- Light gray background
- Friend info clearly displayed
- Remove button (trash icon) on right
- Hover effect on card

**Empty State**
```
You don't have any friends yet.
Search and add some!
```

## Mobile Layout

```
┌─────────────────────────────────┐
│  Friends                 [≡]    │
├─────────────────────────────────┤
│ 👥 Friends                      │
│ Manage your friendships...      │
│                                 │
│ Find Friends                    │
│ ─────────────                   │
│                                 │
│ [Search box]                    │
│                                 │
│ [Send Friend Request]           │
│                                 │
│ 🔔 Friend Requests (2)          │
│ ─────────────────────           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ User 1                      │ │
│ │ @username1                  │ │
│ │ Rating: 1450                │ │
│ │ [✓] [✗]                     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ User 2                      │ │
│ │ @username2                  │ │
│ │ Rating: 1350                │ │
│ │ [✓] [✗]                     │ │
│ └─────────────────────────────┘ │
│                                 │
│ 👥 My Friends (3)               │
│ ─────────────────               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Friend 1                    │ │
│ │ @friend1                    │ │
│ │ Rating: 1500                │ │
│ │                         [🗑] │ │
│ └─────────────────────────────┘ │
│                                 │
│ (More friends below...)         │
│                                 │
└─────────────────────────────────┘
```

## Color Scheme

### Colors Used
| Element | Color | Hex Code |
|---------|-------|----------|
| Primary | Blue | #3b82f6 |
| Success | Green | #22c55e |
| Danger | Red | #ef4444 |
| Background | Light Gray | #f9fafb |
| Card | White | #ffffff |
| Text Primary | Dark Gray | #111827 |
| Text Secondary | Medium Gray | #6b7280 |
| Border | Light Gray | #d1d5db |

### Component Colors
```
Search Button: Blue (Primary action)
                Blue (darker on hover)

Accept Button: Green (Positive action)
               Green (darker on hover)

Reject Button: Red (Negative action)
               Red (darker on hover)

Remove Button: Red text (Hover: red background)

Request Card: Light blue background
Friend Card: Light gray background

Success Message: Green alert box
Error Message: Red alert box
```

## User Interactions

### Sending a Friend Request
1. User types username in search box
2. Sees "Send Friend Request" button
3. Clicks button
4. Button shows spinner + "Sending..."
5. On success:
   - ✅ "Friend request sent successfully!"
   - Box clears
   - Message auto-dismisses after 3 seconds
6. On error:
   - ❌ Error message displays
   - User can retry

### Responding to Request
1. User sees friend requests in blue cards
2. For each request:
   - Sees: displayName, @username, Rating
   - Has two buttons: ✓ (green), ✗ (red)
3. On accept:
   - Request moves to My Friends
   - Green button shows spinner during action
4. On reject:
   - Request disappears
   - Red button shows spinner during action

### Viewing Friends
1. User sees list of all friends
2. For each friend:
   - Sees: displayName, @username, Rating
   - Can hover for emphasis
   - Trash icon appears on hover/always visible
3. On remove:
   - Friend disappears from list
   - Confirmation may appear
   - Count updates

## Loading States

### Initial Load
```
┌─────────────────────────────────┐
│ [Loading spinner]               │
│ Loading friends...              │
└─────────────────────────────────┘
```

### During Request
```
┌─────────────────────────────────┐
│ [⟳ spinning]  Sending...        │
│                                 │
│ Button is disabled during action
└─────────────────────────────────┘
```

### Error States
```
┌──────────────────────────────────────┐
│ ❌ Failed to send friend request      │
│ User not found                        │
│ (Error message clearly displayed)     │
└──────────────────────────────────────┘
```

## Responsive Breakpoints

### Extra Mobile (< 375px)
- Very compact
- Buttons stack if needed
- Larger touch targets

### Mobile (375px - 640px)
- Single column
- Full-width cards
- Larger spacing

### Tablet (641px - 1024px)
- May show 2 columns with optimization
- Comfortable spacing
- Readable text

### Desktop (1025px+)
- 3-column layout
- Optimal spacing
- Professional appearance

## Accessibility Features

### Icons with Labels
- All icons have title attributes
- Text labels for main actions
- Screen reader friendly

### Color Contrast
- Text on backgrounds meets WCAG AA standards
- Not relying only on color (icons + color)
- Clear button states

### Keyboard Navigation
- All buttons focusable
- Tab order logical (top to bottom, left to right)
- Enter key activates buttons
- Escape to close any overlays

### Focus States
```
Button focused:
┌─────────────────────────────────┐
│ Send Friend Request [Focus ring]│
└─────────────────────────────────┘
```

## Visual Feedback

### Hover States
```
Button Normal: Blue (solid)
Button Hover: Darker Blue

Card Normal: Shadow
Card Hover: Darker Shadow

Icon: Gray (normal)
Icon Hover: Colored
```

### Animation Effects
```
Loading: Continuous spin (smooth)
Success: Fade in/out message
Transitions: 200-300ms ease
```

## Typography

### Heading
- h1: 36px, bold, "Friends"

### Subheading
- h2: 20px, bold, Section titles

### Body Text
- 16px, regular, Primary content

### Small Text
- 14px, medium, User handles
- 12px, regular, Ratings/metadata

## Spacing

### Sections
- Top/Bottom: 32px (py-8)
- Left/Right: 16px (px-4)

### Cards
- Padding: 16px (p-4)
- Gap: 12px (gap-3)

### Between Groups
- Gap: 24px (gap-6)

## Interactive Pattern Summary

| Action | Visual Feedback | Confirmation |
|--------|-----------------|--------------|
| Send Request | Spinner | Success message |
| Accept | Spinner | Removed from requests |
| Reject | Spinner | Removed from requests |
| Remove Friend | Icon click | Friend disappears |
| Search | Input focus | Border highlight |

---

**The friend page provides a clean, intuitive interface for managing friendships with clear visual hierarchy and responsive design.**
