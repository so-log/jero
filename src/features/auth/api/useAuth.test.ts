import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

// 호출 인자·실패 토글 스텁.
const calls = vi.hoisted(() => ({
  resetEmail: null as string | null,
  resetRedirect: null as string | null,
  updatedPassword: null as string | null,
  resetError: false,
  updateError: false,
}));
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: (email: string, opts: { redirectTo: string }) => {
        calls.resetEmail = email;
        calls.resetRedirect = opts.redirectTo;
        return Promise.resolve({ error: calls.resetError ? { message: "x" } : null });
      },
      updateUser: ({ password }: { password: string }) => {
        calls.updatedPassword = password;
        return Promise.resolve({ error: calls.updateError ? { message: "x" } : null });
      },
    },
  }),
}));

import { useAuth } from "./useAuth";

beforeEach(() => {
  calls.resetEmail = null;
  calls.resetRedirect = null;
  calls.updatedPassword = null;
  calls.resetError = false;
  calls.updateError = false;
});

describe("useAuth.requestPasswordReset", () => {
  it("resetPasswordForEmail 을 /auth/reset 리다이렉트로 호출", async () => {
    const { result } = renderHookWithClient(() => useAuth());
    await act(async () => {
      await result.current.requestPasswordReset.mutateAsync("a@b.com");
    });
    expect(calls.resetEmail).toBe("a@b.com");
    expect(calls.resetRedirect).toContain("/auth/callback?returnTo=/auth/reset");
  });

  it("실패 시 일반화 에러(계정 존재 비노출)", async () => {
    calls.resetError = true;
    const { result } = renderHookWithClient(() => useAuth());
    await expect(
      result.current.requestPasswordReset.mutateAsync("a@b.com"),
    ).rejects.toThrow(/처리하지 못했어요/);
  });
});

describe("useAuth.updatePassword", () => {
  it("updateUser({password}) 호출", async () => {
    const { result } = renderHookWithClient(() => useAuth());
    await act(async () => {
      await result.current.updatePassword.mutateAsync("newsecret12");
    });
    expect(calls.updatedPassword).toBe("newsecret12");
  });

  it("실패 시 만료 안내 에러", async () => {
    calls.updateError = true;
    const { result } = renderHookWithClient(() => useAuth());
    await expect(
      result.current.updatePassword.mutateAsync("newsecret12"),
    ).rejects.toThrow(/링크가 만료/);
  });
});
