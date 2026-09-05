import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, displayFont, bodyFont } from "../theme";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = ["Ainda anota", "empréstimo", "no caderno?"];
  const line1 = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const line2 = spring({ frame: frame - 12, fps, config: { damping: 16, stiffness: 140 } });
  const line3 = spring({ frame: frame - 24, fps, config: { damping: 14, stiffness: 120 } });

  const strike = interpolate(frame, [45, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badge = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 160 } });

  const renders = [line1, line2, line3];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {words.map((w, i) => (
          <div
            key={w}
            style={{
              fontFamily: displayFont,
              fontWeight: 900,
              fontSize: i === 1 ? 118 : 104,
              color: i === 1 ? colors.gold : colors.cream,
              letterSpacing: -2,
              lineHeight: 1.05,
              opacity: renders[i],
              transform: `translateY(${interpolate(renders[i], [0, 1], [80, 0])}px) rotate(${interpolate(renders[i], [0, 1], [3, 0])}deg)`,
              position: "relative",
            }}
          >
            {w}
            {i === 2 && (
              <div
                style={{
                  position: "absolute",
                  top: "52%",
                  left: 0,
                  height: 10,
                  width: `${strike * 100}%`,
                  background: colors.red,
                  borderRadius: 6,
                  transform: "rotate(-2deg)",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 90,
          alignSelf: "flex-start",
          fontFamily: bodyFont,
          fontWeight: 800,
          fontSize: 44,
          color: colors.bg,
          background: colors.emerald,
          padding: "22px 44px",
          borderRadius: 999,
          opacity: badge,
          transform: `scale(${interpolate(badge, [0, 1], [0.6, 1])})`,
        }}
      >
        Tem jeito melhor ↓
      </div>
    </AbsoluteFill>
  );
};
