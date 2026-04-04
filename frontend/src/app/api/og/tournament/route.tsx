import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "Tanzania Drafti Tournament";
  const format = searchParams.get("format") ?? "";
  const date = searchParams.get("date") ?? "";
  const players = searchParams.get("players") ?? "";
  const prize = searchParams.get("prize") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #09090b 0%, #18180a 50%, #09090b 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            width: "80px",
            height: "6px",
            background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
            borderRadius: "3px",
          }}
        />

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: "999px",
                padding: "6px 16px",
                color: "#fbbf24",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              TzDraft Tournament
            </div>
            {format && (
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "999px",
                  padding: "6px 16px",
                  color: "#a1a1aa",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {format}
              </div>
            )}
          </div>

          <div
            style={{
              color: "#ffffff",
              fontSize: name.length > 40 ? "52px" : "64px",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {name}
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            {date && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#38bdf8",
                  }}
                />
                <span style={{ color: "#a1a1aa", fontSize: "18px", fontWeight: 600 }}>
                  {date}
                </span>
              </div>
            )}
            {players && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#a78bfa",
                  }}
                />
                <span style={{ color: "#a1a1aa", fontSize: "18px", fontWeight: 600 }}>
                  {players} players
                </span>
              </div>
            )}
            {prize && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#fbbf24",
                  }}
                />
                <span style={{ color: "#fbbf24", fontSize: "18px", fontWeight: 700 }}>
                  {prize}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              color: "#52525b",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            tzdraft.co.tz
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
