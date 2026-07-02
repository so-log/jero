import type { IconName } from "@/lib/constants/icons";

/**
 * 시스템 페이지(11) 상태 단일 출처 — 톤·아이콘·코드·문구·액션. 4상태가 동일 레이아웃 공유.
 * 에러 메시지는 일반화(스택·내부 메시지·리소스 존재 비노출, §8.5).
 */
export type SystemVariant = "404" | "error" | "403" | "maintenance";

/** to=라우트(Link), behavior=동작(뒤로/재시도/초대요청/상태). */
export interface SystemAction {
  label: string;
  icon: IconName;
  kind: "primary" | "secondary";
  to?: string;
  behavior?: "back" | "retry" | "invite" | "status";
}

export type SystemTone = "primary" | "warn" | "violet" | "success";

export interface SystemState {
  tone: SystemTone;
  /** 중앙 라인 아이콘. */
  big: IconName;
  /** 흰색 액센트 배지 아이콘. */
  badge: IconName;
  code: string;
  title: string;
  description: string;
  helper?: string;
  actions: SystemAction[];
}

export const SYSTEM_STATES: Record<SystemVariant, SystemState> = {
  "404": {
    tone: "primary",
    big: "map-pin",
    badge: "help",
    code: "404 · NOT FOUND",
    title: "길을 잃은 것 같아요",
    description: "주소가 바뀌었거나 삭제된 여행일 수 있어요.",
    actions: [
      { label: "내 여행 목록으로", icon: "home", kind: "primary", to: "/trips" },
      { label: "이전으로", icon: "arrow-left", kind: "secondary", behavior: "back" },
    ],
  },
  error: {
    tone: "warn",
    big: "route",
    badge: "alert",
    code: "500 · ERROR",
    title: "잠시 문제가 생겼어요",
    description: "일시적인 오류예요. 잠시 후 다시 시도해 주세요.",
    actions: [
      { label: "다시 시도", icon: "refresh", kind: "primary", behavior: "retry" },
      { label: "홈으로", icon: "home", kind: "secondary", to: "/trips" },
    ],
  },
  "403": {
    tone: "violet",
    big: "lock",
    badge: "users",
    code: "403 · FORBIDDEN",
    title: "접근 권한이 없어요",
    description: "초대된 멤버만 볼 수 있는 여행이에요.",
    actions: [
      { label: "홈으로", icon: "home", kind: "primary", to: "/trips" },
      { label: "초대 요청", icon: "mail", kind: "secondary", behavior: "invite" },
    ],
  },
  maintenance: {
    tone: "success",
    big: "wrench",
    badge: "settings",
    code: "점검 중 · MAINTENANCE",
    title: "잠시 점검 중이에요",
    description: "더 나은 제이로를 위해 업데이트하고 있어요.",
    helper: "예상 완료 · 오후 3:00",
    actions: [
      { label: "상태 페이지 보기", icon: "activity", kind: "primary", behavior: "status" },
    ],
  },
};

export const TONE: Record<SystemTone, { tint: string; accent: string }> = {
  primary: { tint: "var(--color-primary-tint)", accent: "var(--primary)" },
  warn: { tint: "var(--color-warn-tint)", accent: "var(--color-warn)" },
  violet: { tint: "var(--color-violet-tint)", accent: "var(--color-violet)" },
  success: { tint: "var(--color-success-tint)", accent: "var(--color-success)" },
};
