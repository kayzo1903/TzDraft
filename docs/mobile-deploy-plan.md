# Mobile App Deployment Plan - Real Testing

## Overview

This document outlines the deployment plan for the TzDraft mobile app to real device testing.

---

## 1. Current State

### Mobile App Configuration
- **Framework**: Expo SDK 54 (React Native 0.81.5)
- **Routing**: expo-router v6
- **State Management**: Zustand
- **API**: Auto-detects from Expo's hostUri

### Key Files
| File | Purpose |
|------|---------|
| [app.json](apps/mobile/app.json) | Expo configuration |
| [package.json](apps/mobile/package.json) | Dependencies & scripts |
| [.env.development](apps/mobile/.env.development) | Dev environment variables |

---

## 2. Environment Configurations

### Required Environments

| Environment | Purpose | API URL |
|-------------|---------|---------|
| Development | Local testing | Auto-detect from hostUri |
| Staging | Pre-production testing | `https://staging-api.tzdraft.com` |
| Production | Live release | `https://api.tzdraft.com` |

### Environment Files Needed

```
apps/mobile/
├── .env.development      # ✅ Exists
├── .env.staging         # Create
└── .env.production      # Create
```

### Staging Environment Template
```bash
# Staging API
EXPO_PUBLIC_API_URL=https://staging-api.tzdraft.com

# Debug Flags
EXPO_PUBLIC_SIMULATE_OFFLINE=false
EXPO_PUBLIC_FORCE_401=false

# Sanity CMS (staging dataset)
EXPO_PUBLIC_SANITY_PROJECT_ID=wvztgicc
EXPO_PUBLIC_SANITY_DATASET=staging
```

### Production Environment Template
```bash
# Production API
EXPO_PUBLIC_API_URL=https://api.tzdraft.com

# Debug Flags (all disabled)
EXPO_PUBLIC_SIMULATE_OFFLINE=false
EXPO_PUBLIC_FORCE_401=false

# Sanity CMS
EXPO_PUBLIC_SANITY_PROJECT_ID=wvztgicc
EXPO_PUBLIC_SANITY_DATASET=production
```

---

## 3. Testing Strategy

### Unit Tests
**Status**: Not yet implemented

**Recommended**: Add Jest + React Native Testing Library
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

### Integration Tests
- API endpoint testing
- WebSocket connection testing
- Authentication flow testing

### E2E Tests
**Recommended**: Expo EAS Build + TestFlight (iOS) / Internal Testing (Android)

### Manual Testing Checklist
- [ ] Login/Logout flow
- [ ] Game creation & joining
- [ ] Real-time game updates via WebSocket
- [ ] Push notifications
- [ ] Offline mode handling
- [ ] Deep linking (tzdraft-mobile://)

---

## 4. Deployment Steps

### Phase 1: Pre-Build Preparation

1. **Create environment files**
   ```bash
   # Create staging env
   cp apps/mobile/.env.development apps/mobile/.env.staging
   
   # Update API URL in .env.staging
   ```

2. **Update app.json for staging**
   ```json
   {
     "expo": {
       "extra": {
         "ENV": "staging"
       }
     }
   }
   ```

3. **Install dependencies**
   ```bash
   cd apps/mobile
   pnpm install
   ```

### Phase 2: Build for Testing

#### Option A: Expo EAS (Recommended)

1. **Configure EAS**
   ```bash
   cd apps/mobile
   npx eas init
   ```

2. **Create build profile for staging**
   ```bash
   npx eas build -p android -profile staging
   npx eas build -p ios -profile staging
   ```

3. **Submit to TestFlight / Internal Testing**
   ```bash
   npx eas submit -p ios
   ```

#### Option B: Local Build (Development)

1. **Generate native projects**
   ```bash
   npx expo prebuild --platform android
   npx expo prebuild --platform ios
   ```

2. **Build APK (Android)**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **Build IPA (iOS)**
   ```bash
   cd ios
   xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Debug -sdk iphonesimulator
   ```

### Phase 3: Distribution

| Platform | Tool | Type |
|----------|------|------|
| iOS | TestFlight | Beta testing |
| iOS | Internal Testing | Private beta |
| Android | Internal App Sharing | Beta testing |
| Android | Google Play Internal Testing | Private beta |

---

## 5. Backend Requirements

### For Real Device Testing

| Requirement | Status | Action |
|-------------|--------|--------|
| Staging server running | Required | Deploy to staging |
| CORS configured | Check | Allow mobile app origins |
| WebSocket accessible | Required | Verify WS endpoint |
| Push notifications | Required | Configure APNS/FCM |

### API Endpoints to Verify
- `POST /auth/login`
- `POST /auth/register`
- `GET /games`
- `POST /games`
- WebSocket: `/game-events`

---

## 6. Action Items

### Immediate (Day 1)
- [ ] Create `.env.staging` file
- [ ] Update `app.json` with staging config
- [ ] Verify backend staging server is running
- [ ] Test local development build on device

### Short Term (Week 1)
- [ ] Set up EAS project
- [ ] Create staging build
- [ ] Distribute to testers
- [ ] Collect feedback

### Medium Term (Month 1)
- [ ] Implement unit tests
- [ ] Set up CI/CD for builds
- [ ] Configure push notifications
- [ ] Prepare production build

---

## 7. Known Considerations

### iOS
- Requires Apple Developer account for TestFlight
- Bundle ID: `com.tzdraft.mobile`
- Deep linking scheme: `tzdraft-mobile`

### Android
- Requires Google Play Console for internal testing
- Package name: `com.tzdraft.mobile`
- Deep linking scheme: `tzdraft-mobile`

### Network
- API auto-detects from `Constants.expoConfig?.hostUri`
- For physical devices, ensure backend is accessible (not localhost)

---

## 8. Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Expo Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Google Play Internal Testing](https://developer.android.com/distribute/internal-testing)
- [TestFlight Guide](https://developer.apple.com/testflight/)