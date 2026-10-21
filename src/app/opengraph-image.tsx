import { ImageResponse } from "next/og";
import { business } from "@/lib/site";

export const alt = `${business.name} — ${business.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(200,149,43,0.55), rgba(200,149,43,0))",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              border: "1px solid rgba(200,149,43,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#C8952B",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            DC
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              color: "#F4F1EA",
              fontSize: 30,
              letterSpacing: 2,
            }}
          >
            <span>DUH</span>
            <span style={{ color: "#C8952B" }}>CORTE</span>
            <span>BARBEARIA</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#F4F1EA", fontSize: 88, lineHeight: 0.95, letterSpacing: -2 }}>
            CORTE NO PONTO,
          </div>
          <div style={{ color: "#C8952B", fontSize: 88, lineHeight: 0.95, letterSpacing: -2 }}>
            POSTURA NO ROLAR.
          </div>
          <div style={{ color: "#A29C93", fontSize: 26, marginTop: 8 }}>
            {`${business.address.street} · ${business.address.neighborhood} · ${business.address.city}/${business.address.state}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#A29C93",
            fontSize: 24,
            borderTop: "1px solid rgba(244,241,234,0.16)",
            paddingTop: 24,
          }}
        >
          <span>5,0 no Google · 123 avaliações</span>
          <span style={{ color: "#C8952B" }}>{business.hashtag}</span>
        </div>
      </div>
    ),
    size,
  );
}
