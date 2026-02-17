# Friend System Implementation

## Overview
The Friend System allows users to manage friendships and friend requests within the TzDraft application. Users can send friend requests, accept/reject them, view their friends list, and remove friends.

## Architecture

The system follows Domain-Driven Design (DDD) principles with the following layers:

### 1. Domain Layer (`src/domain/friend/`)
- **Entities**: 
  - `FriendRequest`: Represents a friend request with status (PENDING, ACCEPTED, REJECTED)
  - `Friendship`: Represents an established friendship between two users

- **Services**:
  - `FriendService`: Core business logic for friend operations

### 2. Application Layer (`src/application/use-cases/`)
- `SendFriendRequestUseCase`: Send a friend request to another user
- `AcceptFriendRequestUseCase`: Accept an incoming friend request
- `RejectFriendRequestUseCase`: Reject an incoming friend request
- `GetFriendsUseCase`: Retrieve all friends for a user
- `GetPendingFriendRequestsUseCase`: Retrieve pending friend requests
- `RemoveFriendUseCase`: Remove an existing friend

### 3. Interface Layer (`src/interface/http/`)
- **Controller**: `FriendController` - REST API endpoints
- **DTOs**: Request/Response data transfer objects

### 4. Database Layer
- **Models**: `FriendRequest` and `Friendship` Prisma models
- **Enums**: `FriendRequestStatus` for status tracking

## Database Schema

### FriendRequest Table
```
- id: UUID (Primary Key)
- requester_id: UUID (Foreign Key to User)
- requestee_id: UUID (Foreign Key to User)
- status: FriendRequestStatus (PENDING | ACCEPTED | REJECTED)
- created_at: Timestamp
- responded_at: Timestamp (nullable)
- Unique constraint: (requester_id, requestee_id)
```

### Friendship Table
```
- id: UUID (Primary Key)
- initiator_id: UUID (Foreign Key to User)
- recipient_id: UUID (Foreign Key to User)
- created_at: Timestamp
- Unique constraint: (initiator_id, recipient_id)
```

## API Endpoints

### Send Friend Request
**POST** `/friends/requests/send`
```json
Request Body:
{
  "friendId": "uuid-of-friend"
}

Response (201):
{
  "id": "request-id",
  "requesterId": "sender-id",
  "requesteeId": "receiver-id",
  "status": "PENDING",
  "createdAt": "2026-02-17T..."
}
```

### Get Pending Friend Requests
**GET** `/friends/requests/pending`
```json
Response (200):
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

### Accept Friend Request
**POST** `/friends/requests/:requesterId/accept`
```json
Response (200):
{
  "id": "request-id",
  "requesterId": "sender-id",
  "requesteeId": "current-user-id",
  "status": "ACCEPTED",
  "respondedAt": "2026-02-17T..."
}
```

### Reject Friend Request
**POST** `/friends/requests/:requesterId/reject`
```json
Response (200):
{
  "id": "request-id",
  "requesterId": "sender-id",
  "requesteeId": "current-user-id",
  "status": "REJECTED",
  "respondedAt": "2026-02-17T..."
}
```

### Get All Friends
**GET** `/friends`
```json
Response (200):
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

### Remove Friend
**DELETE** `/friends/:friendId`
```
Response (204): No Content
```

## Business Logic

### Friend Request Flow

1. **Send Friend Request**
   - Validates users are different
   - Checks if target user exists
   - Checks if already friends
   - Checks for existing pending requests
   - **Auto-accept**: If reverse request exists, automatically creates friendship and updates both requests

2. **Accept Friend Request**
   - Validates request exists and target is correct
   - Updates request status to ACCEPTED
   - Creates Friendship record with requester as initiator

3. **Reject Friend Request**
   - Validates request exists and target is correct
   - Updates request status to REJECTED
   - No friendship record is created

4. **Get Friends**
   - Returns all friendships where user is either initiator or recipient
   - Returns friend information including username, display name, and rating
   - Ordered by friendship creation date (newest first)

5. **Remove Friend**
   - Finds friendship record (regardless of direction)
   - Deletes the friendship record
   - Friend requests are not modified

## Error Handling

The system provides specific error responses:

- **400 Bad Request**
  - Cannot send friend request to yourself
  - Already friends with this user
  - Friend request already sent
  - Invalid friend request

- **404 Not Found**
  - User not found
  - Friend request not found
  - Friendship not found

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Users can only perform actions on their own friend requests
3. **Validation**: Comprehensive input validation on all DTOs
4. **Data Consistency**: Foreign key constraints and unique constraints ensure data integrity

## Usage Examples

### Add a Friend
```bash
# Step 1: Send friend request
POST /friends/requests/send
Authorization: Bearer <token>
{
  "friendId": "friend-uuid"
}

# Step 2 (for receiver): Accept the request
POST /friends/requests/:requesterId/accept
Authorization: Bearer <token>
```

### View Your Friends
```bash
GET /friends
Authorization: Bearer <token>
```

### Remove a Friend
```bash
DELETE /friends/:friendId
Authorization: Bearer <token>
```

## Testing the System

Run the following commands to test the friend system:

```bash
# Compile TypeScript
npm run build

# Run the application
npm start

# Run tests (if implemented)
npm test
```

## Future Enhancements

1. **Friend Groups**: Organize friends into custom groups
2. **Blocking System**: Block specific users
3. **Friend Activity Feed**: Show friend's recent games
4. **Notifications**: WebSocket notifications for friend requests
5. **Friend Statistics**: Compare stats with friends
6. **Invite Friends**: Share game invites with friends
7. **Friend Search**: Search for users by username or phone number
