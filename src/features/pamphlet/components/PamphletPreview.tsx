"use client";

import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import type { PamphletData } from "../api/usePamphletData";
import { faces, faceLabel, type FaceCell, type PamphletSections } from "../lib/faces";
import type { PrepItem } from "../lib/prep";
import { CoverPanel } from "./panels/CoverPanel";
import { DayPanel } from "./panels/DayPanel";
import { IntroPanel } from "./panels/IntroPanel";
import { PrepPanel } from "./panels/PrepPanel";
import { QrPanel } from "./panels/QrPanel";

/**
 * 팜플렛 미리보기(2차, 팜플렛_설계 §4) — faces() → 앞/뒤 면 패널 배치. 미리보기·PDF 인쇄 공용 컴포넌트.
 * 활성 섹션(sections)·테마·준비물은 상위(설정)에서 주입. 데이터는 usePamphletData(§7.1).
 */
export function PamphletPreview({
  tripId,
  theme,
  data,
  prep,
  sections,
  panelWidth = 150,
  shareToken,
}: {
  tripId: string;
  theme: PamphletTheme;
  data: PamphletData;
  prep: PrepItem[];
  sections: PamphletSections;
  panelWidth?: number;
  /** QR 토큰(인쇄 라우트에서 쿼리로 전달). 없으면 QrPanel 이 발급. */
  shareToken?: string;
}) {
  const { front, back } = faces(sections, data.days.length);
  const dayLabels = data.days.map((d) => d.label);

  const renderCell = (cell: FaceCell) => {
    switch (cell.k) {
      case "cover":
        return (
          <CoverPanel
            theme={theme}
            w={panelWidth}
            meta={{ title: data.title, dates: data.dates, nights: data.nights, place: data.place }}
          />
        );
      case "day":
        return <DayPanel theme={theme} w={panelWidth} day={data.days[cell.dayIndex] ?? null} />;
      case "prep":
        return <PrepPanel theme={theme} w={panelWidth} prep={prep} />;
      case "intro":
        return <IntroPanel theme={theme} w={panelWidth} intro={data.intro} highlights={data.highlights} />;
      case "qr":
        return <QrPanel theme={theme} w={panelWidth} tripId={tripId} token={shareToken} />;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PreviewFace label="앞면 (펼쳤을 때)" cells={front} render={renderCell} labels={dayLabels} w={panelWidth} />
      <PreviewFace label="뒷면 (펼쳤을 때)" cells={back} render={renderCell} labels={dayLabels} w={panelWidth} />
    </div>
  );
}

function PreviewFace({
  label,
  cells,
  render,
  labels,
  w,
}: {
  label: string;
  cells: FaceCell[];
  render: (cell: FaceCell) => React.ReactNode;
  labels: string[];
  w: number;
}) {
  return (
    <div className="rounded-panel border border-line bg-background p-[16px_18px] shadow-card">
      <div className="mb-3 text-[11.5px] font-bold tracking-wide text-faint">{label}</div>
      {cells.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-[12.5px] font-medium text-faint">
          표시할 섹션이 없어요
        </div>
      ) : (
        <div className="flex justify-center">
          {cells.map((cell, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative">
                {render(cell)}
                {i < cells.length - 1 && (
                  <span className="absolute top-[6%] bottom-[6%] -right-px border-r border-dashed border-line-strong" />
                )}
              </div>
              <div
                className="mt-2 text-center text-[11px] font-semibold text-mute"
                style={{ width: w }}
              >
                {faceLabel(cell, labels)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
