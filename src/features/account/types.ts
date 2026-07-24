import type { Currency } from "@/lib/constants/fx";

/**
 * 계정(09) 도메인 타입. avatarColor 는 04~08 멤버 식별 색과 동일 소스(User.avatar_color).
 */
export type NotifKey = "trip" | "comment" | "settle" | "marketing";

export interface ProfileDto {
  name: string;
  /** 읽기 전용(인증된 로그인 이메일). */
  email: string;
  avatarColor: string;
  /** 프로필 사진 URL(Supabase Storage public URL). 없으면 색·이니셜 폴백. */
  avatarUrl?: string | null;
  /** 07 예산 기본 통화로 연결. */
  currency: Currency;
  notif: Record<NotifKey, boolean>;
}
