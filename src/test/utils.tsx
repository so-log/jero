import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/** 테스트용 QueryClient — 재시도 끔(즉시 실패 관찰). */
export function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={makeClient()}>{children}</QueryClientProvider>;
}

/** QueryClientProvider 로 감싼 render. */
export function renderWithClient(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

/** QueryClientProvider 로 감싼 renderHook (client 도 반환해 spy 가능). */
export function renderHookWithClient<T>(hook: () => T) {
  const client = makeClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(hook, { wrapper }) };
}
