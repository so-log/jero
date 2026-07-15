"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useTripQuery } from "@/features/trip";
import { PAMPHLET_THEMES } from "@/lib/constants/pamphletThemes";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { useExportPdf } from "../api/useExportPdf";
import { usePamphletData } from "../api/usePamphletData";
import { usePamphletStore } from "../store/pamphletStore";
import { PamphletPreview } from "./PamphletPreview";
import { SettingPanel } from "./SettingPanel";

/**
 * 팜플렛 내보내기 화면(2차, 팜플렛_설계 §1·§4) — 좌측 설정 + 우측 A4 3단 미리보기.
 * 멤버(owner/editor)만 이용, viewer 비노출(§8, 서버 RLS 이중화). PDF 내보내기는 다음 단계.
 */
export function PamphletExportView({ tripId }: { tripId: string }) {
  const { data: trip } = useTripQuery(tripId);
  const data = usePamphletData(tripId);
  const { sections, themeKey, prep, toggleSection } = usePamphletStore();
  const theme = PAMPHLET_THEMES[themeKey];
  const { exportPdf, exporting } = useExportPdf(tripId);

  // 일정 0건이면 일정표 섹션 자동 해제(빈 면 방지). 로딩 중엔 isEmpty 가 임시 true 이므로 제외.
  useEffect(() => {
    if (!data.isLoading && data.isEmpty && sections.schedule) toggleSection("schedule");
  }, [data.isLoading, data.isEmpty, sections.schedule, toggleSection]);

  // 미리보기 A4 3단을 컨테이너 폭에 맞춰 스케일(가로 스크롤 없이). 데스크톱은 150 상한이라 기존과 동일.
  // 3 패널 + PreviewFace 좌우 패딩(18px)·보더(1px) 여유를 빼고 3등분.
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(150);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => {
      const usable = el.clientWidth - 38;
      setPanelWidth(Math.max(88, Math.min(150, Math.floor(usable / 3))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canEdit = trip ? roleCanEdit(trip.my_role) : true;
  if (trip && !canEdit) {
    return (
      <main className="flex h-full w-full items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-faint">
            <Icon name="lock" size={22} strokeWidth={2} />
          </span>
          <p className="text-sm font-bold text-body">편집 멤버만 팜플렛을 만들 수 있어요</p>
          <Link href={`/trips/${tripId}?view=plan`} className="text-[13px] font-semibold text-primary-hover">
            플랜으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const itemCount = data.days.reduce((a, d) => a + d.items.length, 0);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 상단 바 */}
      <header className="flex h-16 flex-none items-center gap-2 border-b border-line px-4 md:gap-3.5 md:px-[22px]">
        <Link
          href={`/trips/${tripId}?view=plan`}
          className="inline-flex h-11 flex-none items-center gap-1.5 rounded-md border border-line-strong bg-background pr-3 pl-2 text-[13px] font-semibold text-subtle hover:bg-secondary"
        >
          <Icon name="chevron-left" size={16} strokeWidth={2.2} />
          플랜으로
        </Link>
        <span className="hidden h-6 w-px bg-line md:inline" />
        <span className="truncate text-[15px] font-extrabold tracking-tight text-ink md:text-[17px]">
          팜플렛 내보내기
        </span>
        {trip && (
          <span className="hidden truncate text-[13px] font-semibold text-faint sm:inline">
            · {trip.title}
          </span>
        )}
        <span className="ml-auto inline-flex flex-none items-center gap-1.5 rounded-pill bg-secondary px-3 py-1.5 text-xs font-bold text-faint">
          <Icon name="file-text" size={14} strokeWidth={2} />
          {data.isEmpty ? "일정 0건" : `${data.days.length}일 · 일정 ${itemCount}건`}
        </span>
      </header>

      {/* 모바일: 세로 스택(설정 → 미리보기, 페이지 단일 스크롤) / 데스크톱: 좌우 2단(각자 스크롤) */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* 설정 */}
        <div className="flex w-full flex-none flex-col border-b border-line md:w-[372px] md:min-h-0 md:border-r md:border-b-0">
          <div className="p-[24px_22px] md:min-h-0 md:flex-1 md:overflow-y-auto">
            <SettingPanel scheduleDisabled={data.isEmpty} />
          </div>
          <div className="flex flex-none gap-2.5 border-t border-line p-[16px_22px]">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void exportPdf(themeKey, sections)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-[14.5px] font-bold text-primary-foreground shadow-primary hover:bg-primary-hover disabled:opacity-60"
            >
              <Icon name="download" size={18} strokeWidth={2.3} />
              {exporting ? "PDF 준비 중…" : "PDF 내보내기"}
            </button>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="flex flex-none flex-col items-center bg-surface p-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:p-[26px_30px]">
          <div ref={previewRef} className="flex w-full max-w-[560px] flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-extrabold text-ink">A4 3단 접이 · 미리보기</span>
                <span className="text-xs font-medium text-faint">297 × 210mm · 접힘 순서대로</span>
              </div>
              <span
                className="inline-flex flex-none items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-bold"
                style={{ background: theme.soft, borderColor: theme.line, color: theme.ink }}
              >
                <span className="size-2.5 rounded-full" style={{ background: theme.accent }} />
                {theme.name}
              </span>
            </div>
            <PamphletPreview
              tripId={tripId}
              theme={theme}
              data={data}
              prep={prep}
              sections={sections}
              panelWidth={panelWidth}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
