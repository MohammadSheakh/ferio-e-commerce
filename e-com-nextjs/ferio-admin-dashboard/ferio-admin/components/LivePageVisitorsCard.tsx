"use client";

import { useEffect, useState } from "react";
import { getAdminSocket } from "@/lib/socket";

interface LivePageStatsPayload {
  totalActive: number;
  pageCounts: Record<string, number>;
  activeVisitors?: Array<{
    page: string;
    role: string;
    name: string;
    userId: string;
  }>;
  timestamp?: string;
}

const PAGE_CONFIG: Record<string, { label: string; path: string }> = {
  "/delivery/portal": {
    label: "Rider delivery portal",
    path: "/delivery/portal",
  },
  "/track": { label: "Order tracking", path: "/track" },
  "/cart": { label: "Cart", path: "/cart" },
  "/checkout": { label: "Checkout", path: "/checkout" },
  "/products": { label: "Products", path: "/products" },
  "/account": { label: "Customer account", path: "/account" },
  "/": { label: "Home and other pages", path: "/" },
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

    function updateTimestamp() {
      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }

    function handleStatsUpdate(payload: LivePageStatsPayload) {
      setStats(payload);
      updateTimestamp();
    }

    function handleConnect() {
      setIsConnected(true);
      socket.emit("request-live-page-stats");
      updateTimestamp();
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

    // Periodic poll for stats refresh
    const interval = setInterval(() => {
      const currentSocket = getAdminSocket();
      if (currentSocket.connected) {
        currentSocket.emit("request-live-page-stats");
      }
    }, 4000);

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
    <div className="flex flex-col justify-between rounded-card border border-line bg-white p-5">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-600" : "bg-amber-600"}`}
            />
            <div>
              <h3 className="text-[14px] font-semibold text-ink">
                Live page visitors
              </h3>
              <p className="text-[11px] text-ink2">
                Current browser sessions by page
              </p>
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
              {totalActive} active now
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {Object.entries(PAGE_CONFIG).map(([route, cfg]) => {
            const count = pageCounts[route] || 0;
            const percentage =
              totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;

            return (
              <div key={route} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 truncate font-medium text-ink">
                    <span className="truncate">{cfg.label}</span>
                    <span className="font-mono text-[10px] text-ink2">
                      ({cfg.path})
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        count > 0 ? "font-medium text-ink" : "text-ink2"
                      }
                    >
                      {count} {count === 1 ? "visitor" : "visitors"}
                    </span>
                    <span className="w-7 text-right font-mono text-[10px] text-ink2">
                      {percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-ink transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-[10px] text-ink2">
        <span>Updates automatically</span>
        <span>Last update: {lastUpdated}</span>
      </div>
    </div>
  );
}
