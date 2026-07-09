"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { useShareActions } from "@/features/workspace/api/useShareActions";

import { usePamphletStore } from "../store/pamphletStore";

/**
 * 팜플렛 QR(2차, 팜플렛_설계 §6) — 기존 공유 토큰(issueShareLink) 재사용해 `/share/[token]` 인코딩.
 * 토큰 없으면 1회 발급(읽기 전용 스코프·만료, §8.2) 후 pamphletStore 캐시. 색은 테마 ink.
 * 컴포넌트 직접 fetch 금지(§7.1) — issueShareLink 뮤테이션 경유. 반환 SVG 문자열(qrcode 라이브러리).
 */
export function useQrCode(
  tripId: string,
  color: string,
  overrideToken?: string,
): { svg: string | null } {
  const storeToken = usePamphletStore((s) => s.shareToken);
  const setShareToken = usePamphletStore((s) => s.setShareToken);
  const { mutateAsync } = useShareActions(tripId).issueShareLink;
  const [svg, setSvg] = useState<string | null>(null);
  const token = overrideToken ?? storeToken;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let t: string | null = token;
      if (!t) {
        try {
          t = await mutateAsync({ role: "viewer" });
          if (cancelled) return;
          setShareToken(t);
        } catch {
          return;
        }
      }
      if (!t) return;
      const url = `${window.location.origin}/share/${t}`;
      const out = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        color: { dark: color, light: "#ffffff" },
      });
      if (!cancelled) setSvg(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, color, token, mutateAsync, setShareToken]);

  return { svg };
}
