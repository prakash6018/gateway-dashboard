"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { can, type Permission } from "@/lib/rbac.ts";
import type { Role } from "@/lib/session.ts";

interface Viewer {
  name: string;
  role: Role;
}

const ViewerContext = createContext<Viewer | null>(null);

export function useViewer() {
  const v = useContext(ViewerContext);
  return { viewer: v, can: (p: Permission) => can(v?.role, p) };
}

export function Providers({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
    </QueryClientProvider>
  );
}
