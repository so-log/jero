import { SharedTripView } from "@/features/share";

/**
 * 08 뷰어 공유 — `/share/[token]`. 공개 경로(비로그인 열람), 워크스페이스 레이아웃과 별도.
 * 토큰 검증·만료·스코프는 서버가 강제(§8.2). Next 16: params 는 Promise.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedTripView token={token} />;
}
