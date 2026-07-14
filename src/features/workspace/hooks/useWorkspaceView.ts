"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { IconName } from "@/components/ui/icon";

/**
 * 워크스페이스 뷰(플랜/캘린더/장소/예산/통계) 단일 출처 — 데스크톱 ViewSegment 와 모바일 드로어가 공유.
 * `?view=` 쿼리만 바꿔 본문 교체(셸·데이터 유지). 라우팅 규약 한 곳에서만 정의(중복 금지).
 */
export type ViewKey = "plan" | "calendar" | "places" | "budget" | "stats";

export const WORKSPACE_VIEWS: { value: ViewKey; label: string; icon: IconName }[] = [
  { value: "plan", label: "플랜", icon: "route" },
  { value: "calendar", label: "캘린더", icon: "calendar" },
  { value: "places", label: "장소", icon: "map-pin" },
  { value: "budget", label: "예산", icon: "wallet" },
  { value: "stats", label: "통계", icon: "activity" },
];

export function useWorkspaceView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("view") as ViewKey) ?? "plan";

  const go = (view: ViewKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return { current, go };
}
