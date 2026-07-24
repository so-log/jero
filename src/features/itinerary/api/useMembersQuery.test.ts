import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "me" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          returns: () =>
            Promise.resolve({
              data: [
                { role: "owner", profile: { id: "me", name: "나", avatar_color: "#3B7DF0", avatar_url: null } },
                { role: "editor", profile: { id: "peer", name: "동료", avatar_color: "#FF8A65", avatar_url: null } },
              ],
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

import { useMembersQuery } from "./usePlacesQuery";

describe("useMembersQuery — online 기본은 본인만(감사 B)", () => {
  it("본인은 online:true, 다른 멤버는 false", async () => {
    const { result } = renderHookWithClient(() => useMembersQuery("trip_1"));
    await waitFor(() => expect(result.current.data).toBeDefined());
    const byId = new Map(result.current.data!.map((m) => [m.id, m]));
    expect(byId.get("me")?.online).toBe(true);
    expect(byId.get("peer")?.online).toBe(false);
  });
});
