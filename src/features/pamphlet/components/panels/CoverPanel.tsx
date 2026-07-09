import { Icon } from "@/components/ui/icon";
import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import { patternSvg, sceneSvg, SvgArt } from "../../lib/art";
import { JeroMark, PanelShell, panelHeight } from "./shared";

interface CoverMeta {
  title: string;
  dates: string;
  nights: string;
  place: string;
}

/** 표지 패널 — 씬 테마면 씬 배경, 패턴 테마면 wash+pattern. 제목·기간·장소(유저데이터=children). */
export function CoverPanel({
  theme,
  w,
  meta,
}: {
  theme: PamphletTheme;
  w: number;
  meta: CoverMeta;
}) {
  const s = w / 232;
  const H = panelHeight(w);
  const ink = theme.ink;

  if (theme.scene) {
    const sceneH = Math.round(H * 0.66);
    return (
      <PanelShell w={w}>
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: sceneH }}>
          <SvgArt inner={sceneSvg(theme.scene, theme)} vw={232} vh={300} width={w} height={sceneH} slice />
        </div>
        <div style={{ position: "absolute", top: 12 * s, left: 14 * s, right: 14 * s, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 * s, background: "rgba(255,255,255,.82)", borderRadius: 99, padding: `4px ${9 * s}px 4px 4px` }}>
            <span style={{ width: 19 * s, height: 19 * s, borderRadius: 6 * s, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <JeroMark size={11 * s} color="#fff" strokeWidth={3.4} />
            </span>
            <span style={{ fontSize: 11 * s, fontWeight: 800, color: ink, letterSpacing: "-.04em" }}>jero</span>
          </div>
          <span style={{ fontSize: 8 * s, fontWeight: 700, color: ink, letterSpacing: ".14em", background: "rgba(255,255,255,.7)", borderRadius: 99, padding: `3px ${7 * s}px` }}>TRAVEL PLAN</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(to top,#fff 68%,rgba(255,255,255,0))", padding: `34px ${18 * s}px ${20 * s}px` }}>
          <div style={{ width: 34 * s, height: 3 * s, borderRadius: 9, background: theme.accent2, marginBottom: 11 * s }} />
          <CoverTitleMeta s={s} ink={ink} accent={theme.accent} meta={meta} titleSize={25} />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell w={w}>
      <div style={{ position: "absolute", inset: 0, background: theme.wash }} />
      <div style={{ position: "relative", padding: `${16 * s}px ${16 * s}px 0`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * s }}>
          <span style={{ width: 22 * s, height: 22 * s, borderRadius: 7 * s, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <JeroMark size={13 * s} color="#fff" strokeWidth={3.4} />
          </span>
          <span style={{ fontSize: 13 * s, fontWeight: 800, color: ink, letterSpacing: "-.04em" }}>jero</span>
        </div>
        <span style={{ fontSize: 8.5 * s, fontWeight: 700, color: theme.accent, letterSpacing: ".14em" }}>TRAVEL PLAN</span>
      </div>
      <div style={{ position: "relative", margin: `${14 * s}px 0`, padding: `0 ${16 * s}px` }}>
        <SvgArt inner={patternSvg(theme.pattern ?? "grid", theme, w - 32 * s, 150 * s)} vw={w - 32 * s} vh={150 * s} width={w - 32 * s} height={150 * s} />
      </div>
      <div style={{ position: "relative", marginTop: "auto", padding: `0 ${18 * s}px ${22 * s}px` }}>
        <div style={{ width: 34 * s, height: 3 * s, borderRadius: 9, background: theme.accent2, marginBottom: 12 * s }} />
        <CoverTitleMeta s={s} ink={ink} accent={theme.accent} meta={meta} titleSize={26} />
      </div>
    </PanelShell>
  );
}

function CoverTitleMeta({
  s,
  ink,
  accent,
  meta,
  titleSize,
}: {
  s: number;
  ink: string;
  accent: string;
  meta: CoverMeta;
  titleSize: number;
}) {
  const line: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 * s, fontSize: 11.5 * s, fontWeight: 600, color: ink, opacity: 0.74 };
  return (
    <>
      <div style={{ fontSize: titleSize * s, fontWeight: 800, color: ink, letterSpacing: "-.035em", lineHeight: 1.12 }}>{meta.title}</div>
      <div style={{ marginTop: 12 * s, display: "flex", flexDirection: "column", gap: 5 * s }}>
        <span style={line}>
          <Icon name="calendar" size={13 * s} strokeWidth={2} color={accent} />
          {meta.dates} · {meta.nights}
        </span>
        <span style={line}>
          <Icon name="map-pin" size={13 * s} strokeWidth={2} color={accent} />
          {meta.place}
        </span>
      </div>
    </>
  );
}
