import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Openfield AI — Open-source AI video studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "74px 88px",
          background: "#0a0a0b",
          color: "#f2f4f4",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: 88, right: 78, opacity: 0.16 }}>
          <div style={{ width: 300, height: 300, borderTop: "8px solid #6fe3c0", borderRight: "8px solid #6fe3c0", borderRadius: 18 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", marginBottom: 28 }}>
            <div style={{ width: 34, height: 30, borderTop: "4px solid #6fe3c0", borderLeft: "4px solid #6fe3c0", borderRadius: 5 }} />
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -4 }}>
            Openfield AI
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 18, letterSpacing: 5, color: "#7d8486" }}>
            OPEN-SOURCE AI VIDEO STUDIO
          </div>
          <div style={{ display: "flex", width: 470, height: 1, marginTop: 34, marginBottom: 28, background: "#2d3132" }} />
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.45, color: "#a8aeaf", maxWidth: 560 }}>
            One prompt bar for image and video. Each model&apos;s own settings, and every finished run in one gallery.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
