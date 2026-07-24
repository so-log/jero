import { describe, expect, it } from "vitest";

import {
  MAX_AVATAR_BYTES,
  avatarStoragePath,
  validateAvatarFile,
  withCacheBust,
} from "./avatar";

describe("validateAvatarFile", () => {
  it("허용 이미지(jpg/png/webp)는 통과", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("비이미지 거부", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 1000 })).toMatch(
      /이미지 파일만/,
    );
  });

  it("지원 안 하는 이미지 형식 거부(예: svg)", () => {
    expect(validateAvatarFile({ type: "image/svg+xml", size: 1000 })).toMatch(
      /형식만 지원/,
    );
  });

  it("2MB 초과 거부", () => {
    expect(
      validateAvatarFile({ type: "image/png", size: MAX_AVATAR_BYTES + 1 }),
    ).toMatch(/2MB 이하/);
    expect(
      validateAvatarFile({ type: "image/png", size: MAX_AVATAR_BYTES }),
    ).toBeNull();
  });
});

describe("avatarStoragePath", () => {
  it("본인 userId 하위 · MIME 별 확장자", () => {
    expect(avatarStoragePath("u1", "image/jpeg")).toBe("u1/avatar.jpg");
    expect(avatarStoragePath("u1", "image/png")).toBe("u1/avatar.png");
    expect(avatarStoragePath("u1", "image/webp")).toBe("u1/avatar.webp");
    // 알 수 없는 타입 → png 폴백
    expect(avatarStoragePath("u1", "image/unknown")).toBe("u1/avatar.png");
  });
});

describe("withCacheBust", () => {
  it("버전 쿼리를 붙인다", () => {
    expect(withCacheBust("https://x/a.png", 42)).toBe("https://x/a.png?v=42");
  });
});
