/**
 * 계정(09) 표시 포맷터(순수, 감사 후속). 마지막 로그인 등 실값 표기.
 */

/**
 * ISO 시각 → "YYYY.M.D 오전/오후 h:mm"(설정 하단 마지막 로그인). 없거나 파싱 실패면 null(표기 숨김).
 */
export function formatLastLogin(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${ampm} ${h12}:${mm}`;
}
