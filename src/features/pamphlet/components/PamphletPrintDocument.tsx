"use client";

import { useEffect } from "react";

import { PAMPHLET_THEMES, type PamphletThemeKey } from "@/lib/constants/pamphletThemes";

import { usePamphletData } from "../api/usePamphletData";
import { faces, type FaceCell, type PamphletSections } from "../lib/faces";
import { DEFAULT_PREP } from "../lib/prep";
import { CoverPanel } from "./panels/CoverPanel";
import { DayPanel } from "./panels/DayPanel";
import { IntroPanel } from "./panels/IntroPanel";
import { PrepPanel } from "./panels/PrepPanel";
import { QrPanel } from "./panels/QrPanel";

/** 인쇄 패널 폭(px) — A4 landscape 3단(≈99mm/panel). */
const PRINT_W = 372;

/** A4 landscape 인쇄 CSS. 미리보기와 동일 패널 → 결과 일치(설계 §5). 툴바는 인쇄 시 숨김. */
const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
@media print { .pf-toolbar { display: none !important; } }
.pf-page { width: 297mm; height: 210mm; display: flex; align-items: center; justify-content: center; background: #fff; break-after: page; page-break-after: always; }
.pf-page:last-child { break-after: auto; page-break-after: auto; }
.pf-row { display: flex; }
`;

/**
 * 팜플렛 인쇄 문서(2차 2단계, 팜플렛_설계 §5 window.print 폴백) — 미리보기와 동일 패널/faces 재사용.
 * 로드 후 자동으로 인쇄 대화상자(브라우저 'PDF로 저장'). 준비물은 기본 목록(쿼리는 theme·sections·token).
 */
export function PamphletPrintDocument({
  tripId,
  themeKey,
  sections,
  token,
}: {
  tripId: string;
  themeKey: PamphletThemeKey;
  sections: PamphletSections;
  token?: string;
}) {
  const data = usePamphletData(tripId);
  const theme = PAMPHLET_THEMES[themeKey];

  useEffect(() => {
    if (data.isLoading) return;
    // SVG·QR 렌더 여유 후 인쇄.
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [data.isLoading]);

  if (data.isLoading) {
    return <div style={{ padding: 40, fontSize: 14, color: "#5A606B" }}>팜플렛을 준비하는 중…</div>;
  }

  const { front, back } = faces(sections, data.days.length);

  const renderCell = (cell: FaceCell) => {
    switch (cell.k) {
      case "cover":
        return (
          <CoverPanel
            theme={theme}
            w={PRINT_W}
            meta={{ title: data.title, dates: data.dates, nights: data.nights, place: data.place }}
          />
        );
      case "day":
        return <DayPanel theme={theme} w={PRINT_W} day={data.days[cell.dayIndex] ?? null} />;
      case "prep":
        return <PrepPanel theme={theme} w={PRINT_W} prep={DEFAULT_PREP} />;
      case "intro":
        return <IntroPanel theme={theme} w={PRINT_W} intro={data.intro} highlights={data.highlights} />;
      case "qr":
        return <QrPanel theme={theme} w={PRINT_W} tripId={tripId} token={token} />;
    }
  };

  return (
    <div style={{ background: "#EEF0F3", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div
        className="pf-toolbar"
        style={{ display: "flex", justifyContent: "center", gap: 10, padding: "14px 0", position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #E4E7EC", zIndex: 5 }}
      >
        <button
          type="button"
          onClick={() => window.print()}
          style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "#3B7DF0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          인쇄 · PDF로 저장
        </button>
      </div>

      {[front, back].map((cells, pi) =>
        cells.length === 0 ? null : (
          <div key={pi} className="pf-page">
            <div className="pf-row">
              {cells.map((cell, i) => (
                <div key={i}>{renderCell(cell)}</div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
