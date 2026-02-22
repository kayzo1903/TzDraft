# Authentication & Security Configuration

This document details the security measures implemented in the application, focusing on API protection, CORS policies, and Request Body handling.

## 1. Cross-Origin Resource Sharing (CORS)

CORS is configured to strictly allow only trusted origins (the frontend) to communicate with the backend.

### Implementation (`backend/src/main.ts`)

We normalize valid origins to ensure both `https://` and `http://` protocols are accepted for trusted domains.

```typescript
// backend/src/main.ts

// 1. Definition of Allowed Origins
const corsOriginsRaw =
  configService.get<string>("CORS_ORIGINS") || "http://localhost:3000";

// 2. Normalization Logic
// Automatically adds https:// and http:// prefix if missing
const allowedOrigins = corsOriginsRaw
  .split(/[,\n]/g)
  .map((origin) => origin.trim())
  .flatMap((origin) => {
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      return [origin];
    }
    return [`https://${origin}`, `http://${origin}`];
  });

// 3. CORS Middleware Configuration
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow server-to-server (no origin)

    // Check against allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Block unknown origins (Client sees CORS Error)
    return callback(null, false);
  },
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
```

## 2. Request Body Parsing & Validation

To prevent attacks and ensure data integrity, we explicitly control how request bodies are successfully parsed and validated.

### Body Parsing (`backend/src/main.ts`)

We intentionally **disabled the default NestJS body parser** to use the standard `express` middleware directly. This ensures full control and compatibility.

```typescript
// backend/src/main.ts

// 1. Disable Default Parser
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false, // <--- CRITICAL: Disables NestJS default
});

// 2. Register Standard Express Parsers
import { json, urlencoded } from "express";

// Limit payload size to 1MB to prevent DoS attacks
app.use(json({ limit: "1mb" }));
app.use(urlencoded({ extended: true }));
```

### Data Validation (`backend/src/main.ts`)

We use `ValidationPipe` to strictly enforce DTO schemas.

```typescript
// backend/src/main.ts

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip properties not in the DTO
    forbidNonWhitelisted: true, // Throw error if extra properties exist
    transform: true, // Automatically transform payloads to DTO instances
  }),
);
```

## 3. Frontend Client Configuration

The frontend must strictly adhere to the `Content-Type: application/json` standard for the backend to accept requests.

### Axios Instance (`frontend/src/lib/axios.ts`)

```typescript
// frontend/src/lib/axios.ts

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    // Explicitly set content type for all requests
    "Content-Type": "application/json",
  },
});
```

## Security Summary

| Feature              | Status         | Protection Against              |
| :------------------- | :------------- | :------------------------------ |
| **CORS**             | ✅ Strict      | malicious-site.com calls        |
| **Body Limit**       | ✅ 1MB         | Denial of Service (DoS)         |
| **Input Validation** | ✅ Whitelisted | Mass Assignment / Injection     |
| **Parser**           | ✅ Standard    | Unknown parsing vulnerabilities |
