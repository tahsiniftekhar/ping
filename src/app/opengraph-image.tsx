import { ImageResponse } from "next/og";

export const alt = "Ping — realtime chat with idempotent sends, server ordering and replay on reconnect";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const points = [
  "Idempotent sends: a retry never duplicates",
  "Reconnect replays what you missed",
  "Order comes from the server, not the clock",
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F5F5F3",
          color: "#171717",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#2878F0" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Ping</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
            Direct and group chat, delivered predictably.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {points.map((point) => (
              <div key={point} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#525252" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: "#1D63C8" }} />
                {point}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#737373" }}>
          Next.js · Express · Socket.io · MongoDB
        </div>
      </div>
    ),
    size,
  );
}
