import { Icon } from "@/components/ui/icon";
import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import { patternSvg, SvgArt } from "../../lib/art";
import { PanelShell } from "./shared";

/** 여행지 소개 패널 — 패턴 스트립 + 소개 문구 + 하이라이트 칩. */
export function IntroPanel({
  theme,
  w,
  intro,
  highlights,
}: {
  theme: PamphletTheme;
  w: number;
  intro: string;
  highlights: string[];
}) {
  const s = w / 232;
  const stripW = w - 28 * s;
  return (
    <PanelShell w={w}>
      <div style={{ padding: `16px ${14 * s}px 8px`, display: "flex", alignItems: "center", gap: 7 * s }}>
        <span style={{ width: 26 * s, height: 26 * s, borderRadius: 8 * s, background: theme.wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="compass" size={15 * s} strokeWidth={2} color={theme.accent} />
        </span>
        <span style={{ fontSize: 14 * s, fontWeight: 800, color: theme.ink, letterSpacing: "-.02em" }}>여행지 소개</span>
      </div>
      <div style={{ margin: `6px ${14 * s}px 0`, height: 64 * s, borderRadius: 8 * s, background: theme.wash, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SvgArt inner={patternSvg(theme.pattern ?? "grid", theme, stripW, 64 * s)} vw={stripW} vh={64 * s} width={stripW} height={64 * s} />
      </div>
      <p style={{ margin: `10px ${14 * s}px 0`, fontSize: 11 * s, fontWeight: 500, color: theme.ink, opacity: 0.72, lineHeight: 1.6 }}>{intro}</p>
      <div style={{ margin: `auto ${14 * s}px 16px`, display: "flex", flexWrap: "wrap", gap: 5 * s }}>
        {highlights.map((hlt, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 * s, background: theme.chipBg, borderRadius: 99, padding: `3px ${9 * s}px`, fontSize: 9.5 * s, fontWeight: 700, color: theme.ink }}>
            <Icon name="map-pin" size={10 * s} strokeWidth={2.4} color={theme.accent} />
            {hlt}
          </span>
        ))}
      </div>
    </PanelShell>
  );
}
