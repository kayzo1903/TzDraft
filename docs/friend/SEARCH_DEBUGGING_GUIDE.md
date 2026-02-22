# Friend Search System - Debugging & Testing

## ✅ Fixed Issues

### Import Paths
The user controller had wrong import paths:
- ❌ Was: `../auth/guards/jwt-auth.guard`
- ✅ Now: `../../../auth/guards/jwt-auth.guard`

- ❌ Was: `../domain/user/user.service`
- ✅ Now: `../../../domain/user/user.service`

- ❌ Was: `../lib/string-similarity.util`
- ✅ Now: `../../../lib/string-similarity.util`

---

## 🔧 Quick Test Checklist

### Step 1: Verify Backend Setup
```bash
# Check user.controller.ts exists
ls backend/src/interface/http/controllers/user.controller.ts

# Check user.module.ts includes UserController
grep "UserController" backend/src/domain/user/user.module.ts

# Check string similarity utility exists
ls backend/src/lib/string-similarity.util.ts

# Check user service has findAll
grep "findAll" backend/src/domain/user/user.service.ts
```

### Step 2: Test Backend Endpoint (Postman/cURL)
```bash
# 1. Get a valid JWT token first by logging in
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+255700000000", "password": "password123"}'

# Copy the accessToken from response

# 2. Test search endpoint
curl -X GET "http://localhost:3002/users/search?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 3: Test Frontend UI
1. Open http://localhost:3000
2. Login with test account
3. Navigate to Friends page
4. Type in search box (e.g., "john")
5. Check if results show up

---

## 🐛 Common Issues & Solutions

### Issue 1: "Connection error"
**Cause**: Backend not running or wrong port  
**Solution**:
```bash
# Check backend is running
cd backend && npm start
# Should print: "Server running on http://localhost:3002"

# Check port is 3002 in frontend
cat frontend/src/lib/axios.ts | grep baseURL
# Should have: http://localhost:3002
```

### Issue 2: "Please log in to search"
**Cause**: JWT token missing or expired  
**Solution**:
```bash
# Check localStorage has accessToken
# In browser DevTools:
localStorage.getItem('accessToken')
# Should return token string, not null

# If null, login again
```

### Issue 3: No Results
**Cause**: No users in database or search term not matching  
**Solution**:
```bash
# Check if users exist in database
# In backend, add logging:
console.log('Total users found:', users.length);
console.log('Search term:', query);

# Or check directly in Prisma:
npx prisma studio
# Go to User table, verify records exist
```

### Issue 4: 400 Error "Search term required"
**Cause**: Empty search query  
**Solution**: Make sure you're typing something in search box

### Issue 5: Import path errors at compile time
**Cause**: Wrong relative paths  
**Solution**: Check paths in user.controller.ts:
```typescript
// ✅ Correct paths
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { UserService } from '../../../domain/user/user.service';
import { fuzzySearch } from '../../../lib/string-similarity.util';
```

---

## 📊 Testing Data

### Create Test Users (via Postman)

**Register User 1:**
```json
{
  "phoneNumber": "+255700000001",
  "username": "john_player",
  "password": "password123",
  "displayName": "John Smith"
}
```

**Register User 2:**
```json
{
  "phoneNumber": "+255700000002",
  "username": "jane_player",
  "password": "password123",
  "displayName": "Jane Games"
}
```

**Register User 3:**
```json
{
  "phoneNumber": "+255700000003",
  "username": "johnny_gamer",
  "password": "password123",
  "displayName": "Johnny Master"
}
```

### Test Searches

| Query | Should Match | Result |
|-------|-------------|--------|
| "john" | John Smith | ✅ 98% |
| "jane" | Jane Games | ✅ 98% |
| "johnny" | Johnny Master | ✅ 98% |
| "jhn" | John Smith | ✅ ~85% (if >= 90%, shows) |
| "game" | Jane Games, Johnny Master | ✅ Multiple results |
| "invalid_user" | None | ❌ "No players found" |

---

## 🔍 Debug Mode Steps

### 1. Add Console Logging to Backend

Edit `user.controller.ts`:
```typescript
async searchUsers(@Query('q') query?: string) {
  console.log('🔍 Search requested:', query);
  
  if (!query || query.trim().length === 0) {
    console.log('❌ Query empty');
    throw new BadRequestException('Search term required');
  }

  try {
    const users = await this.userService.findAll();
    console.log('📦 Total users in DB:', users.length);
    
    const results = fuzzySearch(query, users, ...);
    console.log('🎯 Search results:', results.length);
    console.log('Results:', results);
    
    return results.slice(0, 10).map(...);
  } catch (error) {
    console.error('❌ Search error:', error);
    throw new BadRequestException('Search failed');
  }
}
```

### 2. Check Frontend Network Requests

In Browser DevTools:
1. Open **Network** tab
2. Go to Friends page
3. Type in search box
4. Look for GET request to `/users/search?q=...`
5. Check Response tab for actual results
6. Check if status is 200 or error code

### 3. Check Frontend Console

Open Browser DevTools Console and look for:
- Error messages logged
- Search parameters
- API responses

---

## ✨ Success Indicators

✅ **Backend Working**:
- `npm start` shows no errors
- `/users/search?q=test` returns JSON array
- Console shows `🔍 Search requested`, `📦 Total users`, `🎯 Search results`

✅ **Frontend Working**:
- Search box appears on Friends page
- Type text → results appear after 300ms debounce
- Click result → sends friend request
- Display names show with match scores

✅ **Database Working**:
- `npx prisma studio` shows User records
- Users have displayNames and usernames
- Ratings are associated with users

---

## 🚀 Performance Check

### Response Time
- Search should return in <500ms for <100 users
- With >1000 users, may need database indexing

### Current Behavior
- Loads ALL users into memory
- Fuzzy matches in JavaScript
- Works for <1000 users
- For production: add DB query filtering

### Optimization Todo
1. Add database index on displayName
2. Implement pagination
3. Cache popular searches
4. Use database full-text search

---

## 📝 Post-Deployment Checklist

- [ ] Backend compiled with no errors
- [ ] UserController registered in UserModule
- [ ] Import paths all correct (../ chain)
- [ ] JwtAuthGuard on /users/search endpoint
- [ ] String similarity utility working
- [ ] Test users created in database
- [ ] Frontend can login
- [ ] Search endpoint returns 200
- [ ] Results contain displayName, username, rating, matchScore
- [ ] Match score >= 90%
- [ ] Results limited to top 10
- [ ] No console errors on backend/frontend
- [ ] Debouncing working (300ms after typing stops)
- [ ] Error messages user-friendly (no query exposed)
