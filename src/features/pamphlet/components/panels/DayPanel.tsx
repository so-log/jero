import { Icon } from "@/components/ui/icon";
import { CATEGORY } from "@/lib/constants/category";
import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import type { PamphletDay } from "../../api/usePamphletData";
import { PanelShell } from "./shared";

/** 일정(Day) 패널 — accent 헤더 + 타임라인 아이템(시간·카테고리 칩·이름·메모). day 없으면 빈 상태. */
export function DayPanel({
  theme,
  w,
  day,
}: {
  theme: PamphletTheme;
  w: number;
  day: PamphletDay | null;
}) {
  const s = w / 232;
  return (
    <PanelShell w={w}>
      <div style={{ background: theme.accent, padding: `12px ${14 * s}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14 * s, fontWeight: 800, color: "#fff", letterSpacing: ".02em" }}>{day?.label ?? "DAY"}</span>
          <span style={{ fontSize: 9.5 * s, fontWeight: 600, color: "#fff", opacity: 0.85 }}>{day?.date ?? ""}</span>
        </div>
        <Icon name="route" size={18 * s} strokeWidth={2} color="#fff" />
      </div>

      {!day || day.items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 * s, padding: "0 20px" }}>
          <span style={{ width: 46 * s, height: 46 * s, borderRadius: 14 * s, background: theme.wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="inbox" size={24 * s} strokeWidth={1.9} color={theme.accent} />
          </span>
          <span style={{ fontSize: 12 * s, fontWeight: 700, color: theme.ink, opacity: 0.7, textAlign: "center" }}>아직 등록된 일정이 없어요</span>
        </div>
      ) : (
        <div style={{ flex: 1, padding: `12px ${14 * s}px`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {day.items.map((it, i) => {
            const cat = CATEGORY[it.cat];
            const last = i === day.items.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 9 * s, paddingBottom: last ? 0 : 11 * s }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 * s, flex: "none" }}>
                  <span style={{ width: 16 * s, height: 16 * s, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <span style={{ fontSize: 9 * s, fontWeight: 800, color: "#fff" }}>{i + 1}</span>
                  </span>
                  {!last && <span style={{ flex: 1, width: 2 * s, background: theme.line, marginTop: 2 * s, minHeight: 14 * s }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 * s }}>
                    {it.t && <span style={{ fontSize: 10 * s, fontWeight: 800, color: theme.accent, fontVariantNumeric: "tabular-nums" }}>{it.t}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 * s, background: theme.chipBg, borderRadius: 99, padding: `1px ${6 * s}px` }}>
                      <Icon name={cat.icon} size={9 * s} strokeWidth={2.2} color={theme.ink} />
                      <span style={{ fontSize: 8 * s, fontWeight: 700, color: theme.ink, opacity: 0.8 }}>{cat.label}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 12 * s, fontWeight: 700, color: theme.ink, marginTop: 2 * s, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                  {it.memo && <div style={{ fontSize: 9.5 * s, fontWeight: 500, color: theme.ink, opacity: 0.5, marginTop: 1 * s }}>{it.memo}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
