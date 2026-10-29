"use client";

import { AdminProvider } from "@/components/AdminProvider";
import { StatusProvider } from "@/components/StatusProvider";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StatusProvider>
      <AdminProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="mx-auto w-full max-w-[440px] flex-1 px-4 pb-28 pt-5 md:max-w-6xl md:px-8 md:pb-10 md:pt-6">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
      </AdminProvider>
    </StatusProvider>
  );
}
