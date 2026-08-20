"use client";

import { useEffect, useState } from "react";
import { getAdminSocket } from "@/lib/socket";

interface LivePageStatsPayload {
  totalActive: number;
  pageCounts: Record<string, number>;
  activeVisitors?: Array<{ page: string; role: string; name: string; userId: string }>;
  timestamp?: string;
}

const PAGE_CONFIG: Record<string, { label: string; icon: string; path: string; color: string; bg: string }> = {
  "/delivery/portal": { label: "Rider Delivery Portal", icon: "🛵", path: "/delivery/portal", color: "text-emerald-700", bg: "bg-emerald-500" },
  "/track": { label: "Track Order Page", icon: "🚚", path: "/track", color: "text-amber-700", bg: "bg-amber-500" },
  "/cart": { label: "Cart Page", icon: "🛒", path: "/cart", color: "text-blue-700", bg: "bg-blue-500" },
  "/checkout": { label: "Checkout Page", icon: "💳", path: "/checkout", color: "text-emerald-700", bg: "bg-emerald-500" },
  "/products": { label: "Products & Catalog", icon: "📦", path: "/products", color: "text-purple-700", bg: "bg-purple-500" },
  "/account": { label: "Customer Account", icon: "👤", path: "/account", color: "text-indigo-700", bg: "bg-indigo-500" },
  "/": { label: "Homepage & Others", icon: "🏠", path: "/", color: "text-slate-700", bg: "bg-slate-500" },
};

export default function LivePageVisitorsCard() {
  const [stats, setStats] = useState<LivePageStatsPayload>({
    totalActive: 0,
    pageCounts: {
      "/": 0,
      "/cart": 0,
      "/checkout": 0,
      "/track": 0,
      "/products": 0,
      "/delivery/portal": 0,
    },
    activeVisitors: [],
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Connecting...");

  useEffect(() => {
    const socket = getAdminSocket();

    function handleStatsUpdate(payload: LivePageStatsPayload) {
      setStats(payload);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }

    function handleConnect() {
      setIsConnected(true);
      socket.emit("request-live-page-stats");
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("request-live-page-stats");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("live-page-visitors-stats", handleStatsUpdate);

    // Periodic poll for stats fallback
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("request-live-page-stats");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("live-page-visitors-stats", handleStatsUpdate);
    };
  }, []);

  const totalActive = stats.totalActive || 0;
  const pageCounts = stats.pageCounts || {};

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-xs flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Real-Time Page Visitors</h3>
              <p className="text-[11px] text-ink2">Socket.IO Live Gateway · Port 6734</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {totalActive} Active Now
            </span>
          </div>
        </div>

        {/* Live Visitor Route Breakdown List */}
        <div className="mt-4 space-y-3">
          {Object.entries(PAGE_CONFIG).map(([route, cfg]) => {
            const count = pageCounts[route] || 0;
            const percentage = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;

            return (
              <div key={route} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 font-medium text-ink truncate">
                    <span className="text-[13px]">{cfg.icon}</span>
                    <span className="truncate">{cfg.label}</span>
                    <span className="text-[10px] text-ink2 font-mono">({cfg.path})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-semibold ${count > 0 ? cfg.color : "text-ink2"}`}>
                      {count} {count === 1 ? "visitor" : "visitors"}
                    </span>
                    <span className="text-[10px] text-ink2 font-mono w-7 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-surface/80 overflow-hidden">
                  <div
                    className={`h-full ${cfg.bg} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-5 border-t border-line/60 pt-3 flex items-center justify-between text-[10px] text-ink2">
        <span>● Auto-synced real time</span>
        <span>Last update: {lastUpdated}</span>
      </div>
    </div>
  );
}
