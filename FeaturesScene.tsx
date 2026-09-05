import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, displayFont, bodyFont } from "../theme";

const stroke = { stroke: colors.emerald, strokeWidth: 7, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconDoc = (
  <svg width="52" height="52" viewBox="0 0 48 48">
    <rect x="10" y="4" width="28" height="40" rx="5" {...stroke} />
    <line x1="17" y1="16" x2="31" y2="16" {...stroke} />
    <line x1="17" y1="25" x2="31" y2="25" {...stroke} />
    <line x1="17" y1="34" x2="26" y2="34" {...stroke} />
  </svg>
);
const IconCalendar = (
  <svg width="52" height="52" viewBox="0 0 48 48">
    <rect x="5" y="10" width="38" height="33" rx="6" {...stroke} />
    <line x1="5" y1="21" x2="43" y2="21" {...stroke} />
    <line x1="15" y1="4" x2="15" y2="14" {...stroke} />
    <line x1="33" y1="4" x2="33" y2="14" {...stroke} />
    <circle cx="24" cy="32" r="3.5" fill={colors.emerald} />
  </svg>
);
const IconMoney = (
  <svg width="52" height="52" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="19" {...stroke} />
    <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="800" fill={colors.emerald} fontFamily="sans-serif">$</text>
  </svg>
);
const IconChart = (
  <svg width="52" height="52" viewBox="0 0 48 48">
    <line x1="8" y1="42" x2="44" y2="42" {...stroke} />
    <rect x="11" y="24" width="7" height="18" rx="2" fill={colors.emerald} />
    <rect x="22" y="14" width="7" height="28" rx="2" fill={colors.emerald} />
    <rect x="33" y="5" width="7" height="37" rx="2" fill={colors.emerald} />
  </svg>
);

const FEATURES = [
  { icon: IconDoc, title: "Contratos com PDF", desc: "Parcelado, só juros, mensal ou quinzenal" },
  { icon: IconCalendar, title: "Parcelas sob controle", desc: "Pagamento total ou parcial, com recálculo" },
  { icon: IconMoney, title: "Caixa automático", desc: "O dinheiro sai e volta sozinho" },
  { icon: IconChart, title: "Dashboard de juros", desc: "Quanto tem na rua e o que vem por mês" },
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 80, gap: 34 }}>
      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 78,
          color: colors.cream,
          letterSpacing: -1.5,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [50, 0])}px)`,
        }}
      >
        Tudo no <span style={{ color: colors.emerald }}>seu bolso</span>
      </div>
      {FEATURES.map((f, i) => {
        const s = spring({ frame: frame - 14 - i * 13, fps, config: { damping: 15, stiffness: 160 } });
        return (
          <div
            key={f.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 30,
              background: colors.card,
              border: `2px solid ${colors.emerald}44`,
              borderRadius: 28,
              padding: "30px 36px",
              opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [i % 2 === 0 ? -140 : 140, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 24,
                background: `${colors.emerald}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {f.icon}
            </div>
            <div>
              <div style={{ fontFamily: bodyFont, fontWeight: 800, fontSize: 42, color: colors.cream }}>
                {f.title}
              </div>
              <div style={{ fontFamily: bodyFont, fontWeight: 400, fontSize: 30, color: colors.muted, marginTop: 4 }}>
                {f.desc}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
