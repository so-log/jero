import { z } from "zod";

/**
 * 계정 프로필 폼 단일 출처(09). 이메일은 읽기 전용이라 폼 밖(표시 전용). 클라 검증=UX, 서버 재검증(§8.3).
 */
export const profileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(20),
  avatarColor: z.string(),
  currency: z.enum(["KRW", "JPY", "USD", "EUR"]),
  notif: z.object({
    trip: z.boolean(),
    comment: z.boolean(),
    settle: z.boolean(),
    marketing: z.boolean(),
  }),
});

export type ProfileForm = z.infer<typeof profileSchema>;
