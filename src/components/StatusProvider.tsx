"use client";

import { createContext, useContext } from "react";
import { usePolling } from "@/lib/hooks";
import type { StatusResponse } from "@/lib/types";

interface StatusContextValue {
  data: StatusResponse | null;
  error: string | null;
  updatedAt: number | null;
  refresh: () => void;
}

const StatusContext = createContext<StatusContextValue>({ data: null, error: null, updatedAt: null, refresh: () => {} });

const POLL_MS = 5000;

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const status = usePolling<StatusResponse>("/api/status", POLL_MS);
  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>;
}

export function useStatusContext() {
  return useContext(StatusContext);
}
