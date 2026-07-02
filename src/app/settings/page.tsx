import { AccountSettings } from "@/features/account";

/**
 * 09 계정 설정 — `/settings`. 보호 라우트(미인증 → `/` 리다이렉트)는 인증 도입 시 미들웨어로(§8.2).
 */
export default function SettingsPage() {
  return <AccountSettings />;
}
