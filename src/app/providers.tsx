"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { makeQueryClient } from "@/lib/queryClient";

/**
 * 전역 클라이언트 프로바이더 — TanStack Query.
 * QueryClient 는 컴포넌트 인스턴스마다 한 번만 생성(SSR 간 공유 방지).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
