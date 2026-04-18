import React from "react";
import Svg, { Circle, Rect, Path, G, Ellipse, Line, Polygon } from "react-native-svg";

const S = 40; // default icon size

// ── Play Online ───────────────────────────────────────────────────────────────
export const PlayOnlineIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Globe body */}
    <Circle cx="20" cy="20" r="16" fill="#1d4ed8" opacity={0.15} />
    <Circle cx="20" cy="20" r="16" fill="none" stroke="#3b82f6" strokeWidth="2" />
    {/* Latitude lines */}
    <Ellipse cx="20" cy="20" rx="8" ry="16" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity={0.7} />
    {/* Horizontal bands */}
    <Path d="M4.5 20 Q20 14 35.5 20" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity={0.6} />
    <Path d="M4.5 20 Q20 26 35.5 20" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity={0.6} />
    {/* Signal dot */}
    <Circle cx="29" cy="11" r="5" fill="#60a5fa" />
    <Circle cx="29" cy="11" r="2.5" fill="#fff" />
  </Svg>
);

// ── Play vs AI ────────────────────────────────────────────────────────────────
export const PlayAIIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Robot head */}
    <Rect x="8" y="12" width="24" height="18" rx="4" fill="#6d28d9" opacity={0.2} />
    <Rect x="8" y="12" width="24" height="18" rx="4" fill="none" stroke="#8b5cf6" strokeWidth="2" />
    {/* Eyes */}
    <Rect x="13" y="18" width="5" height="5" rx="1.5" fill="#a78bfa" />
    <Rect x="22" y="18" width="5" height="5" rx="1.5" fill="#a78bfa" />
    {/* Mouth */}
    <Rect x="14" y="26" width="3" height="2" rx="1" fill="#7c3aed" />
    <Rect x="18.5" y="26" width="3" height="2" rx="1" fill="#7c3aed" />
    <Rect x="23" y="26" width="3" height="2" rx="1" fill="#7c3aed" />
    {/* Antenna */}
    <Line x1="20" y1="12" x2="20" y2="7" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="20" cy="5.5" r="2.5" fill="#a78bfa" />
    {/* Ears */}
    <Rect x="4" y="17" width="4" height="8" rx="2" fill="#8b5cf6" />
    <Rect x="32" y="17" width="4" height="8" rx="2" fill="#8b5cf6" />
  </Svg>
);

// ── Play vs Friend ────────────────────────────────────────────────────────────
export const PlayFriendIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Person 1 */}
    <Circle cx="14" cy="13" r="6" fill="#059669" opacity={0.25} />
    <Circle cx="14" cy="13" r="6" fill="none" stroke="#10b981" strokeWidth="2" />
    <Path d="M4 34 Q4 24 14 24 Q24 24 24 34" fill="#10b981" opacity={0.3} />
    <Path d="M4 34 Q4 24 14 24 Q24 24 24 34" fill="none" stroke="#10b981" strokeWidth="2" />
    {/* Person 2 (offset) */}
    <Circle cx="27" cy="13" r="6" fill="#34d399" opacity={0.25} />
    <Circle cx="27" cy="13" r="6" fill="none" stroke="#34d399" strokeWidth="2" />
    <Path d="M17 34 Q17 24 27 24 Q37 24 37 34" fill="#34d399" opacity={0.3} />
    <Path d="M17 34 Q17 24 27 24 Q37 24 37 34" fill="none" stroke="#34d399" strokeWidth="2" />
  </Svg>
);

// ── Free Play ─────────────────────────────────────────────────────────────────
export const FreePlayIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Board outline */}
    <Rect x="5" y="5" width="30" height="30" rx="4" fill="#0e7490" opacity={0.15} />
    <Rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="#06b6d4" strokeWidth="2" />
    {/* Grid lines */}
    <Line x1="5" y1="20" x2="35" y2="20" stroke="#06b6d4" strokeWidth="1" opacity={0.5} />
    <Line x1="20" y1="5" x2="20" y2="35" stroke="#06b6d4" strokeWidth="1" opacity={0.5} />
    {/* Pieces */}
    <Circle cx="12.5" cy="12.5" r="5" fill="#22d3ee" opacity={0.9} />
    <Circle cx="27.5" cy="27.5" r="5" fill="#164e63" stroke="#06b6d4" strokeWidth="1.5" />
    {/* Shuffle arrows */}
    <Path d="M24 8 L28 12 L24 16" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 32 L12 28 L16 24" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Learn & Master ────────────────────────────────────────────────────────────
export const LearnIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Book body */}
    <Rect x="7" y="6" width="22" height="28" rx="3" fill="#92400e" opacity={0.2} />
    <Rect x="7" y="6" width="22" height="28" rx="3" fill="none" stroke="#f59e0b" strokeWidth="2" />
    {/* Spine */}
    <Line x1="13" y1="6" x2="13" y2="34" stroke="#f59e0b" strokeWidth="2" opacity={0.7} />
    {/* Lines of text */}
    <Line x1="17" y1="13" x2="26" y2="13" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    <Line x1="17" y1="18" x2="26" y2="18" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    <Line x1="17" y1="23" x2="23" y2="23" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    {/* Graduation cap */}
    <Polygon points="32,14 22,10 12,14 22,18" fill="#f59e0b" />
    <Line x1="32" y1="14" x2="32" y2="21" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="32" cy="22.5" r="2" fill="#fbbf24" />
  </Svg>
);

// ── Tournaments ───────────────────────────────────────────────────────────────
export const TournamentIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Cup body */}
    <Path d="M12 6 H28 L25 22 Q20 26 15 22 Z" fill="#ca8a04" opacity={0.25} />
    <Path d="M12 6 H28 L25 22 Q20 26 15 22 Z" fill="none" stroke="#eab308" strokeWidth="2" />
    {/* Handles */}
    <Path d="M12 8 Q6 8 6 15 Q6 20 12 20" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
    <Path d="M28 8 Q34 8 34 15 Q34 20 28 20" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
    {/* Stem */}
    <Line x1="20" y1="26" x2="20" y2="32" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
    {/* Base */}
    <Rect x="13" y="32" width="14" height="3" rx="1.5" fill="#eab308" />
    {/* Star on cup */}
    <Polygon points="20,10 21.5,14 25,14 22.5,16.5 23.5,20 20,18 16.5,20 17.5,16.5 15,14 18.5,14" fill="#fde047" />
  </Svg>
);

// ── Game History ──────────────────────────────────────────────────────────────
export const HistoryIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Clock circle */}
    <Circle cx="22" cy="22" r="14" fill="#3730a3" opacity={0.2} />
    <Circle cx="22" cy="22" r="14" fill="none" stroke="#6366f1" strokeWidth="2" />
    {/* Clock hands */}
    <Line x1="22" y1="22" x2="22" y2="13" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
    <Line x1="22" y1="22" x2="28" y2="26" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="22" cy="22" r="2" fill="#a5b4fc" />
    {/* Back arrow */}
    <Path d="M10 14 Q7 8 12 6" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    <Path d="M8 6 L12 6 L12 10" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const LeaderboardIcon = ({ size = S }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    {/* Podium bars */}
    <Rect x="4" y="20" width="10" height="16" rx="2" fill="#db2777" opacity={0.3} />
    <Rect x="4" y="20" width="10" height="16" rx="2" fill="none" stroke="#ec4899" strokeWidth="1.5" />

    <Rect x="15" y="12" width="10" height="24" rx="2" fill="#ec4899" opacity={0.35} />
    <Rect x="15" y="12" width="10" height="24" rx="2" fill="none" stroke="#f472b6" strokeWidth="2" />

    <Rect x="26" y="17" width="10" height="19" rx="2" fill="#db2777" opacity={0.3} />
    <Rect x="26" y="17" width="10" height="19" rx="2" fill="none" stroke="#ec4899" strokeWidth="1.5" />

    {/* Position numbers */}
    <Circle cx="9" cy="15" r="5" fill="#ec4899" />
    <Circle cx="20" cy="7" r="5" fill="#f472b6" />
    <Circle cx="31" cy="12" r="5" fill="#ec4899" />
  </Svg>
);
