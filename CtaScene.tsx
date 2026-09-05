import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, displayFont, bodyFont } from "../theme";

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame, fps, config: { damping: 11, stiffness: 130 } });
  const name = spring({ frame: frame - 12, fps, config: { damping: 15 } });
  const pill = spring({ frame: frame - 30, fps, config: { damping: 13, stiffness: 170 } });
  const url = spring({ frame: frame - 46, fps, config: { damping: 16 } });
  const glow = 1 + Math.sin(frame / 10) * 0.04;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div
        style={{
          width: 210,
          height: 210,
          borderRadius: 56,
          background: `linear-gradient(140deg, ${colors.emerald}, #0A8F66)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 92,
          color: colors.bg,
          boxShadow: `0 0 ${120 * glow}px ${colors.emerald}66`,
          transform: `scale(${interpolate(logo, [0, 1], [0.4, 1])}) rotate(${interpolate(logo, [0, 1], [-14, 0])}deg)`,
        }}
      >
        Q+
      </div>
      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 110,
          color: colors.cream,
          letterSpacing: -3,
          opacity: name,
          transform: `translateY(${interpolate(name, [0, 1], [60, 0])}px)`,
        }}
      >
        Q+Gestão
      </div>
      <div
        style={{
          fontFamily: bodyFont,
          fontWeight: 600,
          fontSize: 40,
          color: colors.muted,
          opacity: name,
          textAlign: "center",
          lineHeight: 1.35,
        }}
      >
        Seus empréstimos sob controle,
        <br />
        até sem internet.
      </div>
      <div
        style={{
          marginTop: 26,
          display: "flex",
          opacity: pill,
          transform: `scale(${interpolate(pill, [0, 1], [0.7, 1])})`,
        }}
      >
        <div
          style={{
            fontFamily: bodyFont,
            fontWeight: 800,
            fontSize: 44,
            background: colors.gold,
            color: colors.bg,
            padding: "24px 50px",
            borderRadius: 999,
          }}
        >
          1 dia grátis
        </div>
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: bodyFont,
          fontWeight: 800,
          fontSize: 38,
          color: colors.cream,
          background: `${colors.cream}12`,
          border: `2px solid ${colors.cream}33`,
          padding: "20px 44px",
          borderRadius: 20,
          opacity: url,
          transform: `translateY(${interpolate(url, [0, 1], [40, 0])}px)`,
        }}
      >
        pixel-perfect-frame-662.lovable.app/vendas
      </div>
    </AbsoluteFill>
  );
};
