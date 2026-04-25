/**
 * Detection utility for mobile app vs web.
 * On this platform, 'mobile app' is defined as either:
 * 1. A native/PWA wrapper (identified via User Agent)
 * 2. A mobile viewport (width < 1024px)
 */
export function isMobileApp(): boolean {
  if (typeof window === "undefined") return false;

  // Check for common app wrapper indicators
  const ua = window.navigator.userAgent || "";
  const isAppUA = /TzDraftApp|Capacitor|Cordova|WebView|iPhone|Android|Mobile/i.test(ua);
  
  // Also check viewport as a fallback/secondary indicator
  const isSmallScreen = window.innerWidth < 1024;

  return isAppUA || isSmallScreen;
}
