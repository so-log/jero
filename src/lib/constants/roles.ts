import type { IconName } from "./icons";

/**
 * 멤버 역할 단일 출처 (계약 §3 member_role enum / 디자인 시스템.dc.html v1.0).
 * 권한 배지 표시용 라벨·아이콘·색. 실제 권한 강제는 서버/RLS (CLAUDE.md §8.2).
 */
export type Role = "owner" | "editor" | "viewer";

export interface RoleMeta {
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
}

export const ROLE: Record<Role, RoleMeta> = {
  owner: { label: "소유자", icon: "crown", bg: "#EAF1FE", fg: "#2F6FE0" },
  editor: { label: "편집자", icon: "pencil", bg: "#E1F6EE", fg: "#1FA078" },
  viewer: { label: "뷰어", icon: "eye", bg: "#F1F3F6", fg: "#7A818D" },
};

export const ROLE_KEYS: Role[] = ["owner", "editor", "viewer"];

/** 편집 권한(장소·일정·지출 변경 가능) 여부 — UI 분기용(서버 재검증 필수) */
export function canEdit(role: Role): boolean {
  return role === "owner" || role === "editor";
}
