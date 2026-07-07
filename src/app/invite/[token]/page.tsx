import { InviteAcceptView } from "@/features/invite";

/**
 * 12 초대 수락 — `/invite/[token]`. 공개 접근(미들웨어 보호 예외), 수락은 인증 필요(비로그인 → 로그인 경유).
 * Next 16: params 는 Promise.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
}
