import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors } from "../theme";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 50) * 40;
  const drift2 = Math.cos(frame / 70) * 60;
  const pulse = interpolate(Math.sin(frame / 25), [-1, 1], [0.85, 1.05]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${colors.bg} 0%, #071410 60%, #050D0A 100%)`,
        overflow: "hidden",
      }}
    >
      {/* soft emerald glow */}
      <div
        style={{
          position: "absolute",
          top: 120 + drift,
          left: -250,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.emerald}33 0%, transparent 65%)`,
          transform: `scale(${pulse})`,
        }}
      />
      {/* gold glow bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 40 + drift2,
          right: -320,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.gold}26 0%, transparent 65%)`,
        }}
      />
      {/* subtle grid lines */}
      <svg
        width="1080"
        height="1920"
        style={{ position: "absolute", opacity: 0.06 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 100}
            y1={0}
            x2={i * 100}
            y2={1920}
            stroke={colors.cream}
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 100}
            x2={1080}
            y2={i * 100}
            stroke={colors.cream}
            strokeWidth="1"
          />
        ))}
      </svg>
      {/* floating coins */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = ((frame * (0.6 + i * 0.25) + i * 420) % 2100) - 100;
        const x = 90 + i * 210 + Math.sin(frame / 30 + i) * 30;
        const size = 26 + (i % 3) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 1920 - y,
              left: x,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `3px solid ${colors.gold}55`,
              opacity: 0.5,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
