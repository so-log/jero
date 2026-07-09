"use client";

import { useState } from "react";

import { useShareActions } from "@/features/workspace/api/useShareActions";
import type { PamphletThemeKey } from "@/lib/constants/pamphletThemes";

import type { PamphletSections } from "../lib/faces";
import { usePamphletStore } from "../store/pamphletStore";

/**
 * PDF 내보내기(팜플렛_설계 §5·§9) — 서버 headless(`POST /api/pamphlet/export`)로 A4 PDF 를 받아
 * blob 다운로드(무인 저장). 서버 렌더 실패 시 **인쇄 라우트 새 탭(window.print) 으로 그레이스풀 폴백**.
 * QR 토큰은 재사용(없으면 발급). 컴포넌트 직접 fetch 금지(§7.1) — 이 api 훅 경유.
 */
export function useExportPdf(tripId: string) {
  const { mutateAsync } = useShareActions(tripId).issueShareLink;
  const storeToken = usePamphletStore((s) => s.shareToken);
  const setShareToken = usePamphletStore((s) => s.setShareToken);
  const [exporting, setExporting] = useState(false);

  const exportPdf = async (
    themeKey: PamphletThemeKey,
    sections: PamphletSections,
  ) => {
    setExporting(true);
    const secStr = Object.entries(sections)
      .filter(([, on]) => on)
      .map(([k]) => k)
      .join(",");
    try {
      let token = storeToken;
      if (!token) {
        token = await mutateAsync({ role: "viewer" });
        setShareToken(token);
      }

      try {
        // 1) 서버 headless PDF → blob 다운로드(무인).
        const res = await fetch("/api/pamphlet/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            theme: themeKey,
            sections: secStr,
            token,
          }),
        });
        if (!res.ok) throw new Error(`export_failed_${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jero-pamphlet-${tripId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        // 2) 폴백: 인쇄 라우트 새 탭(브라우저 'PDF로 저장'). 서버 렌더 불가 환경에서도 내보내기 보장.
        const params = new URLSearchParams({
          theme: themeKey,
          sections: secStr,
          token,
        });
        window.open(
          `/trips/${tripId}/pamphlet/print?${params.toString()}`,
          "_blank",
        );
      }
    } finally {
      setExporting(false);
    }
  };

  return { exportPdf, exporting };
}
