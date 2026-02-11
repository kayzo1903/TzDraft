import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "radial-gradient(1200px 630px at 20% 20%, rgba(249,115,22,0.25), transparent 60%), radial-gradient(900px 630px at 80% 30%, rgba(234,179,8,0.18), transparent 55%), linear-gradient(135deg, #0b0b0b, #111827)",
          color: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(249,115,22,0.22)",
              border: "1px solid rgba(249,115,22,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            TZ
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>TzDraft</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -2 }}>
            Tanzania Drafti
          </div>
          <div style={{ fontSize: 28, opacity: 0.9, maxWidth: 900 }}>
            Learn the rules. Practice vs AI. Play fast, clean 8x8 Drafti in your
            browser.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(15,23,42,0.35)",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            8x8 ruleset
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(249,115,22,0.35)",
              background: "rgba(249,115,22,0.18)",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Play vs AI
          </div>
        </div>
      </div>
    ),
    size,
  );
}

