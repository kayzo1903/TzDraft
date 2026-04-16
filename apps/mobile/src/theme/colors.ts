/**
 * TzDraft Mobile Color System
 *
 * Mirrors the web app design system (frontend/src/app/globals.css).
 * Tokens must stay in sync with the CSS custom properties defined there.
 *
 * DO NOT use raw hex values in component files — import from here instead.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  /** Stone 900 — main screen background  (web: --background) */
  background: '#1c1917',
  /** Stone 800 — card / surface background  (web: --secondary) */
  surface: '#292524',
  /** Stone 700 — elevated surface, input bg  (web: --secondary-hover) */
  surfaceElevated: '#44403c',

  // ── Primary — Savanna Orange ─────────────────────────────────────────────
  /** Orange 500  (web: --primary) */
  primary: '#f97316',
  /** Orange 600  (web: --primary-hover) */
  primaryHover: '#ea580c',
  /** Orange 700  (web: --primary-border) */
  primaryBorder: '#c2410c',

  // Primary with opacity — use for tinted backgrounds / active states
  /** primary @ 5 % */
  primaryAlpha05: 'rgba(249, 115, 22, 0.05)',
  /** primary @ 10 % */
  primaryAlpha10: 'rgba(249, 115, 22, 0.10)',
  /** primary @ 15 % */
  primaryAlpha15: 'rgba(249, 115, 22, 0.15)',
  /** primary @ 30 % — active filter chip border */
  primaryAlpha30: 'rgba(249, 115, 22, 0.30)',

  // ── Text ─────────────────────────────────────────────────────────────────
  /** Stone 50 — primary text  (web: --foreground) */
  foreground: '#fafaf9',
  /** Stone 300 — secondary / body text */
  textSecondary: '#d6d3d1',
  /** Stone 400 — muted / helper text */
  textMuted: '#a8a29e',
  /** Stone 500 — subtle / placeholder text */
  textSubtle: '#78716c',
  /** Stone 600 — disabled text, inactive icons */
  textDisabled: '#57534e',

  // ── Borders ───────────────────────────────────────────────────────────────
  /** Stone 700 — default border */
  border: '#44403c',
  /** Stone 600 — strong border, handles */
  borderStrong: '#57534e',

  // ── Semantic / State ──────────────────────────────────────────────────────
  /** Red 500 */
  danger: '#ef4444',
  /** Red 500 @ 20 % — danger outline backgrounds */
  dangerAlpha20: 'rgba(239, 68, 68, 0.20)',
  /** Emerald 500 — win / success */
  win: '#10b981',
  /** Green 500 */
  success: '#22c55e',
  /** Amber 400 — timer warnings / unverified account status */
  warning: '#f59e0b',

  // ── Board (exact match with web) ─────────────────────────────────────────
  /** Orange 300 — light board squares  (web: --board-light) */
  boardLight: '#fdba74',
  /** Orange 800 — dark board squares   (web: --board-dark) */
  boardDark: '#9a3412',
  /** Near-black — black pieces */
  pieceBlack: '#141210',
  /** Stone 50 — white pieces */
  pieceWhite: '#fafaf9',

  // ── Leaderboard rank medals ───────────────────────────────────────────────
  rankGold: '#f97316',    // aligns with primary
  rankSilver: '#d4d4d8',
  rankBronze: '#a8a29e',

  // ── Utilities ─────────────────────────────────────────────────────────────
  /** Semi-transparent backdrop for modals */
  overlay: 'rgba(0, 0, 0, 0.7)',
  /** Box-shadow color */
  shadow: '#000',
  /** Pure black — text on primary buttons */
  onPrimary: '#000000',
} as const;

export type Colors = typeof colors;
