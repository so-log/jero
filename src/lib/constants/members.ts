/**
 * 멤버 식별 색 (실시간 커서·아바타). 디자인 시스템.dc.html v1.0 의 5색.
 * 실제 값은 `profile.avatar_color`(DB 단일 소스, 계약 §4.1)에서 오며,
 * 이 팔레트는 멤버 생성/시드 시 색을 **배정**하는 용도.
 */
export const MEMBER_COLORS = [
  "#3B7DF0",
  "#FF8A65",
  "#3FC4A0",
  "#B07CF0",
  "#F2A65A",
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

/** index 순환으로 멤버 색 배정 */
export function memberColor(index: number): MemberColor {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
