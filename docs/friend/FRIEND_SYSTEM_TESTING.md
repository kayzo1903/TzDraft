# Friend System - API Testing Guide

This guide provides comprehensive instructions for testing the Friend System endpoints using Postman or similar tools.

## Prerequisites

1. **Backend Running**: Make sure your backend is running at `http://localhost:3002`
2. **JWT Token**: You'll need valid JWT tokens for authenticated users
3. **Users**: Create/login as at least 2 different users to test friend operations

## Base URL
```
http://localhost:3002
```

## Authentication

All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

## Test Endpoints

### 1. Send Friend Request

**Endpoint**: `POST /friends/requests/send`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "friendId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Expected Response** (201 Created):
```json
{
  "id": "f4a9c1b2-3d5e-4f7a-8b9c-0d1e2f3a4b5c",
  "requesterId": "user-id-1",
  "requesteeId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "createdAt": "2026-02-17T10:30:00.000Z"
}
```

**Error Cases**:
- **400**: Cannot send friend request to yourself
- **400**: Already friends with this user
- **400**: Friend request already sent to this user
- **404**: User not found

### 2. Get Pending Friend Requests

**Endpoint**: `GET /friends/requests/pending`

**Headers**:
```
Authorization: Bearer <token>
```

**Expected Response** (200 OK):
```json
[
  {
    "id": "f4a9c1b2-3d5e-4f7a-8b9c-0d1e2f3a4b5c",
    "requester": {
      "id": "user-id-1",
      "username": "john_doe",
      "displayName": "John Doe",
      "rating": 1450
    },
    "status": "PENDING",
    "createdAt": "2026-02-17T10:30:00.000Z"
  }
]
```

### 3. Accept Friend Request

**Endpoint**: `POST /friends/requests/:requesterId/accept`

**Replace `:requesterId` with actual requester ID**

**Headers**:
```
Authorization: Bearer <token>
```

**Expected Response** (200 OK):
```json
{
  "id": "f4a9c1b2-3d5e-4f7a-8b9c-0d1e2f3a4b5c",
  "requesterId": "user-id-1",
  "requesteeId": "current-user-id",
  "status": "ACCEPTED",
  "respondedAt": "2026-02-17T10:35:00.000Z"
}
```

**Error Cases**:
- **404**: Friend request not found
- **400**: Invalid friend request

### 4. Reject Friend Request

**Endpoint**: `POST /friends/requests/:requesterId/reject`

**Replace `:requesterId` with actual requester ID**

**Headers**:
```
Authorization: Bearer <token>
```

**Expected Response** (200 OK):
```json
{
  "id": "f4a9c1b2-3d5e-4f7a-8b9c-0d1e2f3a4b5c",
  "requesterId": "user-id-1",
  "requesteeId": "current-user-id",
  "status": "REJECTED",
  "respondedAt": "2026-02-17T10:36:00.000Z"
}
```

### 5. Get All Friends

**Endpoint**: `GET /friends`

**Headers**:
```
Authorization: Bearer <token>
```

**Expected Response** (200 OK):
```json
[
  {
    "id": "friend-user-id",
    "username": "jane_doe",
    "displayName": "Jane Doe",
    "rating": 1500,
    "friendSince": "2026-02-10T12:00:00.000Z"
  },
  {
    "id": "another-friend-id",
    "username": "bob_smith",
    "displayName": "Bob Smith",
    "rating": 1350,
    "friendSince": "2026-02-08T14:20:00.000Z"
  }
]
```

### 6. Remove Friend

**Endpoint**: `DELETE /friends/:friendId`

**Replace `:friendId` with actual friend's user ID**

**Headers**:
```
Authorization: Bearer <token>
```

**Expected Response** (204 No Content):
```
Empty body
```

**Error Cases**:
- **404**: Friendship not found

## Complete Test Workflow

### Scenario: User A sends friend request to User B

**Step 1**: User A sends friend request to User B
```bash
POST /friends/requests/send
Authorization: Bearer <User_A_Token>
{
  "friendId": "<User_B_ID>"
}
```

**Step 2**: User B views pending requests
```bash
GET /friends/requests/pending
Authorization: Bearer <User_B_Token>
```

**Step 3**: User B accepts the request
```bash
POST /friends/requests/<User_A_ID>/accept
Authorization: Bearer <User_B_Token>
```

**Step 4**: Either user views their friends list
```bash
GET /friends
Authorization: Bearer <User_A_Token>
```

**Step 5** (Optional): User A removes User B as friend
```bash
DELETE /friends/<User_B_ID>
Authorization: Bearer <User_A_Token>
```

## Special Cases

### Auto-Accept Feature

When User A sends a friend request to User B, and User B already has a pending request to User A, the system automatically:
1. Creates a friendship between them
2. Updates both requests to ACCEPTED status

This happens transparently in the Send Friend Request endpoint.

## cURL Examples

### Send Friend Request
```bash
curl -X POST http://localhost:3002/friends/requests/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"friendId":"550e8400-e29b-41d4-a716-446655440000"}'
```

### Get Pending Requests
```bash
curl http://localhost:3002/friends/requests/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Accept Request
```bash
curl -X POST http://localhost:3002/friends/requests/USER_ID/accept \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Friends
```bash
curl http://localhost:3002/friends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Remove Friend
```bash
curl -X DELETE http://localhost:3002/friends/FRIEND_USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Ensure JWT token is valid and not expired |
| 404 User not found | Verify the friendId is a valid user ID |
| 400 Already friends | Check if users are already friends using GET /friends |
| Empty friends list | Friend request might not have been accepted |

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Friend requests have a default status of PENDING
- Once both users are friends, they appear in each other's `/friends` list
- Friendship is bidirectional - appears for both users
- Removing a friend only deletes the friendship, not pending requests
