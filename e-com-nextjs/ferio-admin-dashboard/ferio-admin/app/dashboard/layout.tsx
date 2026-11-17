"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ferio_sidebar_collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  function handleToggle() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ferio_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Top Header - Always visible with Ferio Admin logo & collapse toggle button */}
      <header className="sticky top-0 z-40 flex h-[52px] w-full shrink-0 select-none items-center justify-between border-b border-line bg-paper px-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[14px] font-bold text-white shadow-sm shrink-0">
              F
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink font-sans">
              Ferio Admin
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white hover:bg-slate-100 text-ink2 hover:text-ink transition-colors shadow-2xs"
            title={isCollapsed ? "Expand side panel (Ctrl+B)" : "Collapse side panel (Ctrl+B)"}
            aria-label={isCollapsed ? "Expand side panel" : "Collapse side panel"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-ink2">
          <span className="hidden sm:inline-block font-mono text-[11px] bg-slate-100 border border-line px-2 py-0.5 rounded text-ink2">
            Store Admin
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 min-h-0">
        <Sidebar isCollapsed={isCollapsed} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
