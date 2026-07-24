import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

const calls = vi.hoisted(() => ({
  uploadPath: null as string | null,
  uploadUpsert: null as boolean | null,
  profileUpdate: undefined as unknown,
  removed: null as string[] | null,
  uploadError: false,
}));

vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    storage: {
      from: () => ({
        upload: (path: string, _file: unknown, opts: { upsert: boolean }) => {
          calls.uploadPath = path;
          calls.uploadUpsert = opts.upsert;
          return Promise.resolve({ error: calls.uploadError ? { message: "x" } : null });
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn/${path}` },
        }),
        remove: (paths: string[]) => {
          calls.removed = paths;
          return Promise.resolve({ error: null });
        },
      }),
    },
    from: () => ({
      update: (patch: unknown) => {
        calls.profileUpdate = patch;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  }),
}));

import { useDeleteAvatar, useUploadAvatar } from "./useAccount";

function file(type: string, size: number): File {
  const f = new File(["x"], "a", { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

beforeEach(() => {
  calls.uploadPath = null;
  calls.uploadUpsert = null;
  calls.profileUpdate = undefined;
  calls.removed = null;
  calls.uploadError = false;
});

describe("useUploadAvatar", () => {
  it("검증 통과 → 본인 경로 upsert + avatar_url 저장", async () => {
    const { result } = renderHookWithClient(() => useUploadAvatar());
    await act(async () => {
      await result.current.mutateAsync(file("image/png", 1000));
    });
    expect(calls.uploadPath).toBe("u1/avatar.png");
    expect(calls.uploadUpsert).toBe(true);
    expect(calls.profileUpdate).toMatchObject({
      avatar_url: expect.stringContaining("https://cdn/u1/avatar.png"),
    });
  });

  it("2MB 초과 → 업로드 없이 거부", async () => {
    const { result } = renderHookWithClient(() => useUploadAvatar());
    await expect(
      result.current.mutateAsync(file("image/png", 3 * 1024 * 1024)),
    ).rejects.toThrow(/2MB 이하/);
    expect(calls.uploadPath).toBeNull(); // 스토리지 접근 안 함
  });

  it("비이미지 → 거부", async () => {
    const { result } = renderHookWithClient(() => useUploadAvatar());
    await expect(
      result.current.mutateAsync(file("text/plain", 100)),
    ).rejects.toThrow(/이미지 파일만/);
  });
});

describe("useDeleteAvatar", () => {
  it("스토리지 후보 제거 + avatar_url null", async () => {
    const { result } = renderHookWithClient(() => useDeleteAvatar());
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(calls.removed).toEqual([
      "u1/avatar.jpg",
      "u1/avatar.png",
      "u1/avatar.webp",
      "u1/avatar.gif",
    ]);
    expect(calls.profileUpdate).toMatchObject({ avatar_url: null });
  });
});
