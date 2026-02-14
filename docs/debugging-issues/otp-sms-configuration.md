# OTP SMS Configuration Issue

**Issue:** OTP registration fails with "Failed to send OTP. Please try again." on both local and production environments.

**Status:** ✅ **RESOLVED**

**Date Discovered:** 2026-02-14  
**Date Resolved:** 2026-02-14  
**Severity:** High (blocking new user registration)

---

## Problem Description

Users could not register new accounts because OTP SMS sending was failing. The error message was:

```
{"message":"Failed to send OTP. Please try again.","error":"Bad Request","statusCode":400}
```

### Symptoms

1. ✅ Existing phone number detection worked (database connection OK)
2. ❌ New phone numbers couldn't receive OTP
3. ❌ No logs visible in production (logger was disabled)

---

## Root Cause

**Environment variable name mismatch** between `.env` file and code expectations.

**The `.env` file had:**

```bash
BEEM_API_KEY=7bba501aa4d3a729
BEEM_SECRET_KEY=MjcwNzY4NjMyMDQyZThkYzA3YWI3MzZhNWVlNjY0ZDVjYWU2NzFmYmZjOTE3OTRlNWY2NzI1ZWMzZjI1NmJkZQ==
BEEM_SENDER_ID=zetutech
```

**The code expected:**

```typescript
// backend/src/infrastructure/sms/beam-africa.service.ts
this.apiKey = this.config.get<string>("BEAM_AFRICA_API_KEY") || "";
this.secretKey = this.config.get<string>("BEAM_AFRICA_SECRET_KEY") || "";
this.senderId = this.config.get<string>("BEAM_AFRICA_SENDER_ID") || "TzDraft";
```

This resulted in empty credentials, causing Beam Africa API to return:

```json
{
  "code": 120,
  "message": "Invalid api_key and/or secret_id"
}
```

---

## Debugging Process

### Phase 1: Initial Investigation

- Checked that existing phone numbers were detected ✅
- Confirmed database connectivity ✅
- Identified OTP sending was failing ❌

### Phase 2: Logger Issue

- **Discovery:** No logs were appearing in production
- **Cause:** NestJS logger was disabled in production (`logger: isProd ? false : undefined`)
- **Fix:** Temporarily enabled logger to see error details

### Phase 3: Error Details

After enabling logging, saw:

```
[BEAM_AFRICA] Error sending OTP: Request failed with status code 401
[BEAM_AFRICA] Error details: {"code":120,"message":"Invalid api_key and/or secret_id"}
```

### Phase 4: Local Testing

- Tested locally with `npm run start:dev`
- Reviewed `.env` file
- **Discovery:** Variable names were `BEEM_*` instead of `BEAM_AFRICA_*`

---

## Solution

### Fix 1: Update .env File (Local)

```bash
# Change from:
BEEM_SENDER_ID=zetutech
BEEM_API_KEY=7bba501aa4d3a729
BEEM_SECRET_KEY=MjcwNzY4NjMyMDQyZThkYzA3YWI3MzZhNWVlNjY0ZDVjYWU2NzFmYmZjOTE3OTRlNWY2NzI1ZWMzZjI1NmJkZQ==

# To:
BEAM_AFRICA_SENDER_ID=zetutech
BEAM_AFRICA_API_KEY=7bba501aa4d3a729
BEAM_AFRICA_SECRET_KEY=MjcwNzY4NjMyMDQyZThkYzA3YWI3MzZhNWVlNjY0ZDVjYWU2NzFmYmZjOTE3OTRlNWY2NzI1ZWMzZjI1NmJkZQ==
```

### Fix 2: Update Render Environment Variables

In Render Dashboard → Environment Variables:

1. Change `BEEM_API_KEY` → `BEAM_AFRICA_API_KEY`
2. Change `BEEM_SECRET_KEY` → `BEAM_AFRICA_SECRET_KEY`
3. Change `BEEM_SENDER_ID` → `BEAM_AFRICA_SENDER_ID`
4. **Restart the service** for changes to take effect

---

## Verification

**Local Test:**

```
[BeamAfricaService] OTP sent successfully to +255...
```

**Production Test:**

- Registration completes successfully
- SMS is sent to phone number
- OTP verification works

---

## Prevention Checklist

To avoid this issue in future projects:

### 1. Consistent Naming Convention

✅ Use a single naming convention across all environments

```typescript
// Choose ONE pattern and stick to it:
BEAM_AFRICA_API_KEY; // ✅ Descriptive and clear
BEEM_API_KEY; // ❌ Ambiguous, conflicts with code
```

### 2. Environment Variable Validation

Add startup validation in `main.ts`:

```typescript
const requiredEnvVars = ["BEAM_AFRICA_API_KEY", "BEAM_AFRICA_SECRET_KEY"];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

### 3. .env.example File

Create `.env.example` with correct variable names:

```bash
# SMS Configuration (Beam Africa)
BEAM_AFRICA_API_KEY=your_api_key_here
BEAM_AFRICA_SECRET_KEY=your_secret_key_here
BEAM_AFRICA_SENDER_ID=YourAppName
```

### 4. Enable Logging in Production

For critical third-party services, always log errors:

```typescript
// Good: Log configuration status on startup
if (!this.apiKey || !this.secretKey) {
  this.logger.warn("Beam Africa credentials not configured");
}
```

---

## Related Issues

This issue was discovered while debugging:

- [Authentication Body Parsing on Render](./auth-body-parsing-render.md)

Both issues highlight the importance of:

1. ✅ Testing in production-like environments
2. ✅ Proper logging configuration
3. ✅ Environment variable validation

---

## Files Modified

- [`backend/.env`](file:///c:/Users/Admin/Desktop/TzDraft/backend/.env) - Fixed variable names
- Environment variables on Render (deploy platform)

---

**Documented by:** AI Assistant  
**Resolution Time:** ~45 minutes (most time spent waiting for logs)  
**Last Updated:** 2026-02-14
