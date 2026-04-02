export const emailTheme = {
  colors: {
    // ── Backgrounds ────────────────────────────────────────────────────────
    background: '#1c1917', // stone-900  — outer page
    surface: '#292524', // stone-800  — card fill
    surfaceHigh: '#44403c', // stone-700  — elevated card / info box
    overlay: '#1c1917cc', // card overlay tone

    // ── Text ───────────────────────────────────────────────────────────────
    text: '#fafaf9', // stone-50   — headings & strong copy
    textMuted: '#d6d3d1', // stone-300  — body copy
    textSubtle: '#78716c', // stone-500  — captions, footer

    // ── Brand ──────────────────────────────────────────────────────────────
    primary: '#f97316', // orange-500 — Savanna Orange (main accent)
    primaryDeep: '#c2410c', // orange-700 — border / shadow
    amber: '#fbbf24', // amber-400  — gradient second stop (logo)

    // ── Borders ────────────────────────────────────────────────────────────
    border: '#3c3734', // stone-750  — card borders
    borderSubtle: '#292524', // stone-800  — subtle dividers

    // ── States ─────────────────────────────────────────────────────────────
    success: '#22c55e', // green-500
    successBg: '#052e16', // green-950
    error: '#ef4444', // red-500
    errorBg: '#1c0a0a', // red-950
    gold: '#f59e0b', // amber-500  — champions
    goldBg: '#1c1203', // amber-950

    // ── Board ──────────────────────────────────────────────────────────────
    boardLight: '#fdba74', // orange-300
    boardDark: '#9a3412', // orange-800
  },
  appName: 'TzDraft',
  appUrl: 'https://tzdraft.zetutech.co.tz',
  logoUrl: 'https://tzdraft.zetutech.co.tz/icon.png',
  companyName: 'ZetuTech',
  companyUrl: 'https://zetutech.co.tz',
  location: 'Dar es Salaam, Tanzania',
};

// ── Shared inline styles ──────────────────────────────────────────────────────

export const sharedStyles = {
  main: {
    backgroundColor: '#1c1917',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,sans-serif',
    margin: '0',
    padding: '0',
  },

  container: {
    margin: '0 auto',
    padding: '0 0 40px',
    maxWidth: '600px',
    width: '100%',
  },

  /** Orange top bar — the checkerboard-inspired accent strip */
  topBar: {
    background: '#f97316',
    height: '4px',
    width: '100%',
    marginBottom: '0',
  },

  /** Header section containing the wordmark */
  header: {
    textAlign: 'center' as const,
    padding: '32px 40px 24px',
    backgroundColor: '#1c1917',
  },

  wordmark: {
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '-1px',
    color: '#f97316',
    margin: '0',
    lineHeight: '1',
  },

  wordmarkAccent: {
    color: '#fbbf24',
  },

  tagline: {
    color: '#78716c',
    fontSize: '12px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    margin: '6px 0 0',
    fontWeight: '600',
  },

  /** Main card */
  card: {
    backgroundColor: '#292524',
    border: '1px solid #3c3734',
    borderRadius: '16px',
    padding: '36px 40px',
    margin: '0 20px 24px',
  },

  /** Section label above headings */
  eyebrow: {
    color: '#f97316',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    margin: '0 0 10px',
  },

  h1: {
    color: '#fafaf9',
    fontSize: '22px',
    fontWeight: '800',
    lineHeight: '1.25',
    margin: '0 0 16px',
    letterSpacing: '-0.3px',
  },

  body: {
    color: '#d6d3d1',
    fontSize: '15px',
    lineHeight: '1.65',
    margin: '0 0 16px',
  },

  /** Orange CTA button */
  button: {
    backgroundColor: '#f97316',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '14px 32px',
  },

  buttonContainer: {
    textAlign: 'center' as const,
    margin: '24px 0 8px',
  },

  /** Info box — stone-700 fill */
  infoBox: {
    backgroundColor: '#44403c',
    borderRadius: '10px',
    padding: '16px 20px',
    margin: '16px 0',
  },

  infoLine: {
    color: '#d6d3d1',
    fontSize: '14px',
    margin: '0 0 6px',
    lineHeight: '1.5',
  },

  infoLineLabel: {
    color: '#78716c',
    fontWeight: '600',
  },

  /** Coloured callout box */
  callout: (borderColor: string, bgColor: string) => ({
    borderLeft: `3px solid ${borderColor}`,
    backgroundColor: bgColor,
    borderRadius: '8px',
    padding: '14px 18px',
    margin: '20px 0',
  }),

  hr: {
    borderColor: '#3c3734',
    margin: '24px 0',
  },

  hint: {
    color: '#78716c',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0',
  },

  footer: {
    textAlign: 'center' as const,
    padding: '0 20px',
  },

  footerText: {
    color: '#57534e',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '4px 0',
  },

  footerLink: {
    color: '#78716c',
    textDecoration: 'underline' as const,
    fontSize: '12px',
  },

  footerDivider: {
    margin: '0 8px',
    color: '#44403c',
  },

  /** Metric boxes for analytics */
  metricBox: {
    backgroundColor: '#44403c',
    borderRadius: '8px',
    padding: '12px 16px',
    textAlign: 'center' as const,
    border: '1px solid #3c3734',
  },

  metricLabel: {
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 4px',
  },

  metricValue: {
    color: '#fafaf9',
    fontSize: '20px',
    fontWeight: '800',
    margin: '0',
  },

  /** Smaller metric boxes */
  smallMetricBox: {
    backgroundColor: '#3c3734',
    borderRadius: '6px',
    padding: '8px 12px',
    textAlign: 'center' as const,
  },

  smallMetricLabel: {
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 2px',
  },

  smallMetricValue: {
    color: '#fafaf9',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0',
  },

  h2: {
    color: '#fafaf9',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 16px',
    letterSpacing: '-0.2px',
  },
};
