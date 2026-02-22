# Friend Page - Frontend Implementation

## Overview

The Friend Page is a complete frontend implementation for managing friendships in TzDraft. It allows users to:
- Search for and add new friends
- View pending friend requests with accept/reject actions
- See their complete friends list
- Remove friends

## File Structure

```
frontend/
├── src/
│   ├── services/
│   │   └── friend.service.ts          # API client service
│   ├── components/
│   │   └── friend/
│   │       ├── index.ts               # Component exports
│   │       ├── friend-search.tsx      # Search & add friends component
│   │       ├── friend-list.tsx        # Display friends list component
│   │       └── pending-requests.tsx   # Handle pending requests component
│   ├── app/
│   │   └── [locale]/
│   │       └── friends/
│   │           ├── page.tsx           # Main friends page
│   │           └── layout.tsx         # Page metadata & SEO
│   └── components/
│       └── layout/
│           └── Navbar.tsx             # Updated with Friends link
```

## Components

### 1. FriendSearch Component
**File**: `src/components/friend/friend-search.tsx`

Allows users to search for and add friends.

**Features**:
- Search input field
- Send friend request button
- Error and success messages
- Loading states
- Disabled state during submission

**Props**:
```typescript
interface FriendSearchProps {
  onAdd?: (userId: string) => void;  // Callback when friend added
}
```

### 2. FriendList Component
**File**: `src/components/friend/friend-list.tsx`

Displays user's current friends.

**Features**:
- Lists all friends with their info
- Shows rating/ELO
- Remove friend button
- Loading and error states
- Empty state message

**Props**:
```typescript
interface FriendListProps {
  refreshTrigger?: number;  // Trigger to refresh list
}
```

### 3. PendingRequests Component
**File**: `src/components/friend/pending-requests.tsx`

Manages incoming friend requests.

**Features**:
- Shows pending friend requests
- Accept button (green check icon)
- Reject button (red X icon)
- User info display (username, rating)
- Loading and error states
- Auto-hides when no requests

**UI**:
- Blue background to distinguish from friends
- Two action buttons per request
- Shows requester's rating and username

## Services

### FriendService
**File**: `src/services/friend.service.ts`

Provides API methods for friend operations:

```typescript
friendService.sendFriendRequest(friendId: string)
friendService.getPendingRequests()
friendService.acceptFriendRequest(requesterId: string)
friendService.rejectFriendRequest(requesterId: string)
friendService.getFriends()
friendService.removeFriend(friendId: string)
```

All methods return API responses or throw errors.

## Pages

### Friends Page
**File**: `src/app/[locale]/friends/page.tsx`

Main page layout with:
- Responsive 3-column grid layout
- Left column: Friend search (1 column)
- Right column: Pending requests + Friends list (2 columns)
- Header with icon and description
- Authentication check with redirect to login

**Layout Responsive Design**:
- Mobile: Single column (search, then requests, then list)
- Tablet/Desktop: 3-column grid with search on left, lists on right

### Friends Layout
**File**: `src/app/[locale]/friends/layout.tsx`

Provides:
- SEO metadata
- Canonical URLs
- Multi-language support (en, sw)
- OpenGraph tags
- Robots configuration

## API Integration

The frontend connects to the backend API endpoints (running on port 3002):

```
POST   /friends/requests/send                  - Send friend request
GET    /friends/requests/pending               - Get pending requests
POST   /friends/requests/:requesterId/accept   - Accept request
POST   /friends/requests/:requesterId/reject   - Reject request
GET    /friends                                 - Get all friends
DELETE /friends/:friendId                      - Remove friend
```

All requests are authenticated via JWT tokens through axios instance.

## State Management

The page uses:
- **React Hooks**:
  - `useState` - For local component state
  - `useEffect` - For data loading and lifecycle
- **Auth Hook** - `useAuth()` from hooks/useAuth.ts
- **Router Hook** - `useRouter()` from i18n/routing

**State Variables**:
- `friends` - Array of friend objects
- `requests` - Array of pending requests
- `loading` - Loading state for API calls
- `error` - Error messages
- `responding` - ID of request being processed
- `refreshTrigger` - Trigger for list refresh

## Styling

Uses Tailwind CSS with:
- Responsive grid layout
- Hover effects and transitions
- Color coding (blue for requests, red for errors, green for success)
- Shadow and rounded corners
- Lucide React icons

**Color Scheme**:
- Blue: Primary actions and new requests
- Green: Success (accept button)
- Red: Danger (reject, remove friends)
- Gray: Neutral background and text

## Navigation Integration

Updated `Navbar.tsx` to include:
- Friends link in user dropdown menu
- Positioned between Profile and Settings
- Uses same icon styling and hover effects
- Accessible to authenticated users only

## Error Handling

**User-Friendly Error Messages**:
- Network errors
- Validation errors from API
- User not found errors
- Duplicate request errors
- Already friends errors

Errors display:
- In red alert boxes
- With clear descriptive messages
- Automatically dismiss success messages after 3 seconds

## Authentication & Authorization

- **Protected Route**: Friends page requires authentication
- Redirects to login if not authenticated
- Uses local auth store with zustand
- Authentication persisted across pages

## Usage Example

After building, users can:

1. **Navigate to Friends Page**
   - Click "Friends" in user menu (after login)
   - Or navigate to `/friends`

2. **Search for Friends**
   - Enter username in search box
   - Click "Send Friend Request"

3. **Manage Requests**
   - See incoming requests at top
   - Accept with green check button
   - Reject with red X button

4. **View Friends**
   - See all current friends in list
   - Click trash icon to remove friend
   - See friend's rating/ELO

## Development

### Building
```bash
cd frontend
npm run build
```

### Running
```bash
npm run dev
```

### Code Style
- TypeScript for type safety
- React functional components
- Tailwind CSS for styling
- Lucide React for icons

## Performance Optimizations

1. **Component Optimization**:
   - Separate components for each feature
   - Prevents unnecessary re-renders
   
2. **Data Fetching**:
   - Loads data on component mount
   - Refresh trigger pattern for updates
   - Efficient API calls

3. **UI/UX**:
   - Loading states prevent duplicate submissions
   - Error messages for user feedback
   - Smooth transitions and interactions

## Accessibility

- Semantic HTML structure
- Descriptive button titles (`title` attribute)
- Icon-based buttons with context
- Keyboard-friendly inputs
- Proper color contrast

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Future Enhancements

Potential additions:
1. **Friend Search API** - Fetch users from backend
2. **Friend Groups** - Organize friends into groups
3. **Friend Stats** - Compare game stats with friends
4. **Friend Activity** - See recent games played
5. **Friend Messages** - In-app messaging
6. **Blocking** - Block users functionality
7. **Real-time Notifications** - WebSocket updates
8. **Advanced Search** - Filter by rating, region, etc.

## Deployment

No special deployment configuration needed:
- Follows existing Next.js setup
- Uses existing auth system
- Integrates with existing styling
- No new environment variables required

## Testing Checklist

- [ ] Navigate to /friends page while authenticated
- [ ] Can search for friends (placeholder search)
- [ ] Can send friend request successfully
- [ ] Send request shows success message
- [ ] Can view pending friend requests
- [ ] Can accept friend requests
- [ ] Can reject friend requests
- [ ] Can view friends list
- [ ] Can remove friends
- [ ] Error messages display correctly
- [ ] Redirects to login if not authenticated
- [ ] Responsive on mobile, tablet, desktop
- [ ] Icons load correctly
- [ ] Navigation link appears in user menu
