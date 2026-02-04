# TzDraft API - Troubleshooting

Common issues and solutions when testing the API.

---

## 🔴 Connection Issues

### Error: "Could not get response" / Connection Refused

**Symptoms**:

- Postman shows "Could not get response"
- Network error in console

**Solutions**:

1. **Check backend is running**:

   ```bash
   npm run start:dev
   ```

   Should show: `Nest application successfully started`

2. **Verify port**:
   - Default: `http://localhost:3000`
   - Check `.env` file for `PORT` setting

3. **Check firewall**:
   - Allow Node.js through firewall
   - Disable VPN if blocking localhost

---

## 🔴 Game Not Found

### Error: "Game with ID ... not found"

**Symptoms**:

```json
{
  "statusCode": 404,
  "message": "Game with ID uuid not found"
}
```

**Solutions**:

1. **Verify gameId is set**:
   - Check Postman environment variables
   - Ensure `{{gameId}}` is populated

2. **Create game first**:
   - Run `POST /games/pvp` before other requests
   - Use test script to auto-save gameId

3. **Check database**:
   ```bash
   npx prisma studio
   ```
   Verify game exists in database

---

## 🔴 Invalid Move Errors

### Error: "Invalid move"

**Common Causes**:

#### 1. Piece doesn't exist at position

**Solution**: Check board state, verify piece is at `from` position

#### 2. Move violates rules

**Solution**:

- Use `GET /moves/legal` to see valid moves
- Check Tanzania Drafti rules

#### 3. Capture is mandatory

**Error**: "Capture is mandatory"
**Solution**: When capture is available, you MUST capture

#### 4. Wrong piece color

**Solution**: Verify you're moving your own piece

---

## 🔴 Turn Errors

### Error: "Not this player's turn"

**Symptoms**:

```json
{
  "message": "Not this player's turn"
}
```

**Solutions**:

1. **Check current turn**:

   ```
   GET /games/{{gameId}}
   ```

   Look at `currentTurn` field

2. **Use correct playerId**:
   - WHITE's turn → use `whitePlayerId`
   - BLACK's turn → use `blackPlayerId`

3. **Verify query parameter**:
   ```
   POST /games/{{gameId}}/moves?playerId=player-001
   ```

---

## 🔴 Validation Errors

### Error: Array of validation messages

**Example**:

```json
{
  "statusCode": 400,
  "message": ["from must not be less than 1", "to must not be greater than 32"]
}
```

**Solutions**:

1. **Check position range**: Must be 1-32
2. **Check data types**: Numbers not strings
3. **Required fields**: Ensure all required fields present

---

## 🔴 Database Errors

### Error: "Prisma Client not initialized"

**Solution**:

```bash
npx prisma generate
npm run build
npm run start:dev
```

---

### Error: "Table does not exist"

**Solution**:

```bash
npx prisma db push
```

---

## 🔴 Game State Issues

### Game status is FINISHED but trying to make move

**Error**: "Game is not active"

**Solution**:

- Create new game
- Cannot make moves in finished games

---

### Cannot abort game

**Error**: "Cannot abort game after moves are made"

**Solution**:

- Abort only works with 0 moves
- Use resign or draw instead

---

## 🐛 Debugging Tips

### 1. Check Response Status

- **200**: Success
- **201**: Created
- **400**: Bad request (your error)
- **404**: Not found
- **500**: Server error (backend issue)

### 2. View Full Response

Enable Postman console:

- View → Show Postman Console
- See full request/response

### 3. Check Backend Logs

Terminal running `npm run start:dev` shows:

- Request logs
- Error stack traces
- Validation failures

### 4. Test with Simple Request

Start with basic request:

```
GET /games/{{gameId}}
```

If this fails, check connection/gameId

### 5. Verify Environment

- Check active environment in Postman
- Verify variables are set correctly

---

## 📊 Expected Performance

**Normal Response Times**:

- Create Game: < 100ms
- Make Move: < 150ms
- Get Legal Moves: < 100ms
- Get Game State: < 100ms

**If slower**:

- Check database connection
- Check system resources
- Restart backend

---

## 🔍 Common Mistakes

### ❌ Using string instead of number

```json
{
  "from": "9", // Wrong
  "to": "13"
}
```

### ✅ Correct

```json
{
  "from": 9,
  "to": 13
}
```

---

### ❌ Missing playerId query parameter

```
POST /games/{{gameId}}/moves
```

### ✅ Correct

```
POST /games/{{gameId}}/moves?playerId=player-001
```

---

### ❌ Wrong base URL

```
http://localhost:3001  // Wrong port
```

### ✅ Correct

```
http://localhost:3000
```

---

## 🆘 Still Having Issues?

1. **Check backend logs** for error details
2. **Verify database** is connected (Prisma Studio)
3. **Restart backend** (`npm run start:dev`)
4. **Clear Postman cache** (Settings → Data)
5. **Try different endpoint** to isolate issue

---

**Need Help?** Check the API documentation or backend logs for more details.
