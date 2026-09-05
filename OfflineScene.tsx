import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, displayFont, bodyFont } from "../theme";

export const OfflineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneL = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 120 } });
  const phoneR = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 120 } });
  const syncLine = interpolate(frame, [42, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const title = spring({ frame: frame - 50, fps, config: { damping: 16 } });
  const wifiPulse = 1 + Math.sin(frame / 6) * 0.08;

  const Phone: React.FC<{ prog: number; rotate: number }> = ({ prog, rotate }) => (
    <div
      style={{
        width: 300,
        height: 560,
        borderRadius: 44,
        background: colors.bg2,
        border: `3px solid ${colors.emerald}66`,
        boxShadow: `0 30px 80px ${colors.emerald}22`,
        opacity: prog,
        transform: `translateY(${interpolate(prog, [0, 1], [140, 0])}px) rotate(${rotate}deg) scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
        display: "flex",
        flexDirection: "column",
        padding: 26,
        gap: 14,
      }}
    >
      <div style={{ height: 34, borderRadius: 10, background: `${colors.emerald}55` }} />
      {[70, 90, 55, 80].map((w, i) => (
        <div key={i} style={{ height: 22, width: `${w}%`, borderRadius: 8, background: `${colors.cream}22` }} />
      ))}
      <div style={{ height: 60, borderRadius: 14, background: `${colors.gold}44`, marginTop: 8 }} />
      {[60, 85, 75].map((w, i) => (
        <div key={i} style={{ height: 22, width: `${w}%`, borderRadius: 8, background: `${colors.cream}1A` }} />
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
        <Phone prog={phoneL} rotate={-7} />
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: colors.emerald,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            color: colors.bg,
            transform: `scale(${syncLine * wifiPulse})`,
            opacity: syncLine,
            zIndex: 2,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 48 48">
            <path d="M8 18 H34 M34 18 l-8 -7 M34 18 l-8 7" stroke={colors.bg} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 32 H14 M14 32 l8 -7 M14 32 l8 7" stroke={colors.bg} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <Phone prog={phoneR} rotate={7} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 84,
          color: colors.cream,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [60, 0])}px)`,
        }}
      >
        Funciona <span style={{ color: colors.gold }}>offline</span>
        <br />
        <span style={{ fontSize: 60, color: colors.muted, fontFamily: bodyFont, fontWeight: 600 }}>
          e sincroniza entre celulares
        </span>
      </div>
    </AbsoluteFill>
  );
};
