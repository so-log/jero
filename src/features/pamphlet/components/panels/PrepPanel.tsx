import { Icon } from "@/components/ui/icon";
import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import type { PrepItem } from "../../lib/prep";
import { PanelShell } from "./shared";

/** 준비물 패널 — 체크리스트(on/off 표시만, 편집은 설정 패널). */
export function PrepPanel({
  theme,
  w,
  prep,
}: {
  theme: PamphletTheme;
  w: number;
  prep: PrepItem[];
}) {
  const s = w / 232;
  return (
    <PanelShell w={w}>
      <div style={{ padding: `16px ${14 * s}px 10px`, display: "flex", alignItems: "center", gap: 7 * s }}>
        <span style={{ width: 26 * s, height: 26 * s, borderRadius: 8 * s, background: theme.wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="luggage" size={15 * s} strokeWidth={2} color={theme.accent} />
        </span>
        <span style={{ fontSize: 14 * s, fontWeight: 800, color: theme.ink, letterSpacing: "-.02em" }}>준비물 체크</span>
      </div>
      <div style={{ height: 2, background: theme.line, margin: `0 ${14 * s}px` }} />
      <div style={{ flex: 1, padding: `12px ${14 * s}px`, display: "flex", flexDirection: "column", gap: 9 * s }}>
        {prep.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 * s }}>
            <span style={{ width: 16 * s, height: 16 * s, borderRadius: 5 * s, border: `2px solid ${p.on ? theme.accent : theme.line}`, background: p.on ? theme.accent : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              {p.on && <Icon name="check" size={10 * s} strokeWidth={3.2} color="#fff" />}
            </span>
            <span style={{ fontSize: 12 * s, fontWeight: p.on ? 700 : 500, color: theme.ink, opacity: p.on ? 1 : 0.55 }}>{p.label}</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
