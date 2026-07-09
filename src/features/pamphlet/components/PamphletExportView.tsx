"use client";

import Link from "next/link";
import { useEffect } from "react";

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

  const canEdit = trip ? roleCanEdit(trip.my_role) : true;
  if (trip && !canEdit) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-faint">
            <Icon name="lock" size={22} strokeWidth={2} />
          </span>
          <p className="text-sm font-bold text-body">편집 멤버만 팜플렛을 만들 수 있어요</p>
          <Link href={`/trips/${tripId}?view=plan`} className="text-[13px] font-semibold text-primary-hover">
            플랜으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = data.days.reduce((a, d) => a + d.items.length, 0);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 상단 바 */}
      <header className="flex h-16 flex-none items-center gap-3.5 border-b border-line px-[22px]">
        <Link
          href={`/trips/${tripId}?view=plan`}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-background pr-3 pl-2 text-[13px] font-semibold text-subtle hover:bg-secondary"
        >
          <Icon name="chevron-left" size={16} strokeWidth={2.2} />
          플랜으로
        </Link>
        <span className="h-6 w-px bg-line" />
        <span className="text-[17px] font-extrabold tracking-tight text-ink">팜플렛 내보내기</span>
        {trip && <span className="text-[13px] font-semibold text-faint">· {trip.title}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-secondary px-3 py-1.5 text-xs font-bold text-faint">
          <Icon name="file-text" size={14} strokeWidth={2} />
          {data.isEmpty ? "일정 0건" : `${data.days.length}일 · 일정 ${itemCount}건`}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 좌측 설정 */}
        <div className="flex w-[372px] flex-none flex-col border-r border-line">
          <div className="flex-1 overflow-y-auto p-[24px_22px]">
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

        {/* 우측 미리보기 */}
        <div className="flex flex-1 flex-col items-center overflow-y-auto bg-surface p-[26px_30px]">
          <div className="flex w-full max-w-[560px] flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-extrabold text-ink">A4 3단 접이 · 미리보기</span>
                <span className="text-xs font-medium text-faint">297 × 210mm · 접힘 순서대로</span>
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-bold"
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
              panelWidth={150}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
