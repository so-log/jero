/**
 * 아바타 업로드 검증·경로(순수, 감사 후속). 컴포넌트/훅이 공유하는 단일 출처.
 * 보안(§8.3): 신뢰 못 할 원본 → 타입(image/*)·크기(≤2MB) 검증. 경로는 본인 userId 하위만(RLS 이중화).
 */

/** 최대 파일 크기(2MB). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** 허용 확장자 매핑(MIME → ext) — 저장 경로 확장자 결정. */
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** 파일 검증 — 통과면 null, 아니면 사용자용 에러 메시지. */
export function validateAvatarFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!file.type.startsWith("image/")) {
    return "이미지 파일만 올릴 수 있어요.";
  }
  if (!MIME_EXT[file.type]) {
    return "JPG · PNG · WEBP · GIF 형식만 지원해요.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "이미지 크기는 2MB 이하여야 해요.";
  }
  return null;
}

/** 저장 경로 `{userId}/avatar.<ext>` — 본인 폴더에 고정 파일명(upsert 로 교체). */
export function avatarStoragePath(userId: string, mimeType: string): string {
  const ext = MIME_EXT[mimeType] ?? "png";
  return `${userId}/avatar.${ext}`;
}

/** publicUrl 캐시 무효화 — 같은 경로 upsert 시 브라우저 캐시 방지용 쿼리(?v=timestamp). */
export function withCacheBust(url: string, version: number): string {
  return `${url}?v=${version}`;
}
