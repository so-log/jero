"use client";

import { useState } from "react";

import { useShareActions } from "@/features/workspace/api/useShareActions";
import type { PamphletThemeKey } from "@/lib/constants/pamphletThemes";

import type { PamphletSections } from "../lib/faces";
import { usePamphletStore } from "../store/pamphletStore";

/**
 * PDF 내보내기(2차 2단계, 팜플렛_설계 §5 window.print 폴백) — 인쇄 라우트를 새 탭으로 열어
 * 브라우저 'PDF로 저장'을 유도한다. QR 토큰은 재사용(없으면 발급). 컴포넌트 직접 fetch 금지(§7.1).
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
    try {
      let token = storeToken;
      if (!token) {
        token = await mutateAsync({ role: "viewer" });
        setShareToken(token);
      }
      const secStr = Object.entries(sections)
        .filter(([, on]) => on)
        .map(([k]) => k)
        .join(",");
      const params = new URLSearchParams({ theme: themeKey, sections: secStr, token });
      window.open(`/trips/${tripId}/pamphlet/print?${params.toString()}`, "_blank");
    } finally {
      setExporting(false);
    }
  };

  return { exportPdf, exporting };
}
