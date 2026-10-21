import { ImageResponse } from "next/og";

export const alt = "Fundraise — Know your numbers. Own your next move.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "linear-gradient(135deg, #ffffff 0%, #f5f2ff 55%, #ede9fe 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            fontStyle: "italic",
            color: "#4c1d95",
          }}
        >
          fundraise.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#7c3aed",
            border: "2px solid #ddd6fe",
            background: "#ffffff",
            borderRadius: 999,
            padding: "10px 24px",
          }}
        >
          PLANNING SUITE
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 700,
            color: "#18181b",
            lineHeight: 1.15,
          }}
        >
          <div style={{ display: "flex" }}>Know your numbers.</div>
          <div style={{ display: "flex", color: "#7c3aed" }}>
            Own your next move.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#52525b" }}>
          Valuation · dilution · cap table · runway · investor returns
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {[
          "Runs in your browser",
          "No data leaves the device",
          "PDF & CSV reports",
        ].map((chip) => (
          <div
            key={chip}
            style={{
              display: "flex",
              fontSize: 22,
              color: "#4c1d95",
              background: "#ffffff",
              border: "2px solid #ddd6fe",
              borderRadius: 999,
              padding: "12px 26px",
            }}
          >
            {chip}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
