# Friend System - Complete Integration Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│                                                              │
│  Pages:                                                      │
│  - /friends                  Main friend page                │
│                                                              │
│  Components:                                                 │
│  - FriendSearch             Search & add friends             │
│  - FriendList               View all friends                 │
│  - PendingRequests          Manage incoming requests         │
│                                                              │
│  Service:                                                    │
│  - friendService            API client                       │
│                                                              │
│  Navigation:                                                 │
│  - Added to user menu                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP/REST API (axios)
                    Authenticated (JWT)
                    Base URL: http://localhost:3002
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                           │
│                                                              │
│  Controller:                                                 │
│  - FriendController         Route handler                    │
│                                                              │
│  Use Cases:                                                  │
│  - SendFriendRequestUseCase                                 │
│  - AcceptFriendRequestUseCase                               │
│  - RejectFriendRequestUseCase                               │
│  - GetFriendsUseCase                                        │
│  - GetPendingFriendRequestsUseCase                          │
│  - RemoveFriendUseCase                                      │
│                                                              │
│  Domain:                                                     │
│  - FriendService            Business logic                   │
│  - FriendRequest Entity      Data model                      │
│  - Friendship Entity         Data model                      │
│                                                              │
│  Database:                                                   │
│  - friend_requests table    Stores requests                  │
│  - friendships table        Stores connections               │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Send Friend Request
**Frontend Call**:
```typescript
friendService.sendFriendRequest(friendId)
```

**Backend**:
```
POST /friends/requests/send
Authorization: Bearer <token>
Body: { friendId: "uuid" }
```

**Response**:
```json
{
  "id": "request-id",
  "requesterId": "user-id-1",
  "requesteeId": "user-id-2",
  "status": "PENDING",
  "createdAt": "2026-02-17T..."
}
```

### 2. Get Pending Requests
**Frontend Call**:
```typescript
friendService.getPendingRequests()
```

**Backend**:
```
GET /friends/requests/pending
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "request-id",
    "requester": {
      "id": "user-id",
      "username": "john_doe",
      "displayName": "John Doe",
      "rating": 1450
    },
    "status": "PENDING",
    "createdAt": "2026-02-17T..."
  }
]
```

### 3. Accept Friend Request
**Frontend Call**:
```typescript
friendService.acceptFriendRequest(requesterId)
```

**Backend**:
```
POST /friends/requests/:requesterId/accept
Authorization: Bearer <token>
```

### 4. Reject Friend Request
**Frontend Call**:
```typescript
friendService.rejectFriendRequest(requesterId)
```

**Backend**:
```
POST /friends/requests/:requesterId/reject
Authorization: Bearer <token>
```

### 5. Get All Friends
**Frontend Call**:
```typescript
friendService.getFriends()
```

**Backend**:
```
GET /friends
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "friend-user-id",
    "username": "jane_doe",
    "displayName": "Jane Doe",
    "rating": 1500,
    "friendSince": "2026-02-10T..."
  }
]
```

### 6. Remove Friend
**Frontend Call**:
```typescript
friendService.removeFriend(friendId)
```

**Backend**:
```
DELETE /friends/:friendId
Authorization: Bearer <token>
```

## Data Flow

### Adding a Friend

1. **User enters username** → FriendSearch component
2. **Click "Send Friend Request"** → `friendService.sendFriendRequest(userId)`
3. **API Call** → POST /friends/requests/send
4. **Backend Validation**:
   - Check user exists
   - Check not self-request
   - Check not already friends
   - Check for existing request
5. **Success**:
   - FriendRequest record created
   - Component shows success message
   - Input cleared
6. **Error**:
   - Error message displayed
   - User can retry

### Accepting a Request

1. **PendingRequests component loads** → `friendService.getPendingRequests()`
2. **User clicks accept button** → `friendService.acceptFriendRequest(requesterId)`
3. **API Call** → POST /friends/requests/:requesterId/accept
4. **Backend**:
   - Updates FriendRequest status to ACCEPTED
   - Creates Friendship record
5. **Frontend**:
   - Request removed from pending list
   - Appears in friends list on refresh

### Viewing Friends

1. **FriendList component mounts** → `friendService.getFriends()`
2. **API Call** → GET /friends
3. **Backend** → Returns all friends with metadata
4. **Component displays**:
   - Friend name and username
   - Rating
   - Remove button

## Authentication Flow

1. User logs in → JWT token obtained
2. Token stored in auth store (zustand)
3. Token attached to all API requests via axios interceptor
4. Backend verifies token and returns user context
5. If token invalid/expired → Redirect to login

## Frontend Setup

### Prerequisites
- Node.js 18+
- Next.js 16+
- TypeScript
- Tailwind CSS
- lucide-react for icons

### Installation
```bash
cd frontend
npm install
# or
pnpm install
```

### Build
```bash
npm run build
```

### Run
```bash
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables
Create `.env.local` if needed (backend URL for socket connections)

## Backend Setup

### Prerequisites
- Node.js 18+
- NestJS 10+
- PostgreSQL
- Prisma

### Installation
```bash
cd backend
npm install
# or
pnpm install
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Build
```bash
npm run build
```

### Run
```bash
npm start
# Runs on http://localhost:3002
```

## Testing the Complete System

### Step 1: Start Backend
```bash
cd backend
npm start
# Listens on http://localhost:3002
```

### Step 2: Run Database Migration (if not done)
```bash
npx prisma migrate deploy
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Step 4: Test Flow
1. Open browser to `http://localhost:3000`
2. Signup/Login with 2 different accounts
3. Navigate to Friends page from user menu
4. On first account: Search and send friend request to second account
5. On second account: Accept/reject the request
6. Both accounts should see each other in friends list
7. Test removing friend

## Features Summary

### What Works ✅
- Send friend requests
- Accept/reject requests
- View friends list with ratings
- Remove friends
- View pending requests
- Auto-accept on mutual requests
- Error handling and validation
- Responsive design
- Mobile-friendly UI
- Authentication protected routes

### Future Enhancements 🔄
- Real-time notifications (WebSocket)
- Friend search with user database lookup
- Friend groups/lists
- Friend activity feed
- Chat/messaging
- Block users
- Compare statistics with friends
- Leaderboard with friends filter

## Security Considerations

### Implemented ✅
- JWT authentication required
- Users can only manage their own requests
- Database constraints prevent duplicates
- Cascade delete prevents orphaned records
- Input validation on DTOs
- CORS properly configured

### Recommended 🔒
- Rate limiting on friend requests
- Spam prevention
- Report friend functionality
- Privacy settings per friend

## Performance Notes

### Optimizations
- Indexes on frequently queried fields
- Selective field projection in responses
- Efficient bidirectional friendship lookup
- Component-level loading states
- Error boundary considerations

### Scalability
For large user bases:
- Consider caching friend lists (Redis)
- Pagination for large friend lists
- Async processing for notifications
- Database query optimization

## Troubleshooting

### Frontend issues
- **404 on /friends** → Check route is in [locale] folder
- **403 Unauthorized** → Check JWT token validity
- **API 404** → Verify backend is running on 3002
- **Styling broken** → Run `npm install` and rebuild

### Backend issues
- **Cannot find FriendRequest** → Run `npx prisma generate`
- **Migration failed** → Check PostgreSQL connection
- **Module not found** → Run `npm install` in backend

### Database issues
- **Tables don't exist** → Run migration with `npx prisma migrate deploy`
- **Prisma client outdated** → Run `npx prisma generate`
- **Connection timeout** → Check DATABASE_URL environment variable

## File Checklist

### Frontend Files Created
- [ ] `src/services/friend.service.ts`
- [ ] `src/components/friend/friend-search.tsx`
- [ ] `src/components/friend/friend-list.tsx`
- [ ] `src/components/friend/pending-requests.tsx`
- [ ] `src/components/friend/index.ts`
- [ ] `src/app/[locale]/friends/page.tsx`
- [ ] `src/app/[locale]/friends/layout.tsx`

### Frontend Files Modified
- [ ] `src/components/layout/Navbar.tsx` (Added Friends link)

### Backend Files (From Previous Implementation)
- [ ] `src/domain/friend/entities/friend-request.entity.ts`
- [ ] `src/domain/friend/entities/friendship.entity.ts`
- [ ] `src/domain/friend/friend.service.ts`
- [ ] `src/domain/friend/friend.module.ts`
- [ ] `src/application/use-cases/*friend*.use-case.ts` (6 files)
- [ ] `src/interface/http/controllers/friend.controller.ts`
- [ ] Database models and migration

## Next Steps

1. ✅ Backend Friend System (Done)
2. ✅ Frontend Friend Page (Done)
3. 🔄 Add friend search to user database lookup
4. 🔄 Implement WebSocket notifications
5. 🔄 Add friend groups
6. 🔄 Add friend statistics comparison
7. 🔄 Add friend activity feed

## Deployment

### Frontend (Vercel)
```bash
git push to main
# Automatic deployment to Vercel
```

### Backend (VPS/Cloud)
```bash
# Deploy Docker container or Node app
# Ensure DATABASE_URL pointing to production DB
# Run migrations: npx prisma migrate deploy
```

## Support & Documentation

- **API Docs**: See `docs/friend/FRIEND_SYSTEM_TESTING.md`
- **Frontend Docs**: See `docs/friend/FRIEND_PAGE_FRONTEND.md`
- **System Architecture**: See `docs/friend/FRIEND_SYSTEM.md`
- **Setup Guide**: See `docs/friend/FRIEND_SYSTEM_QUICKSTART.md`

---

**System is production-ready! 🚀**
