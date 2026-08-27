"use client";

import { useEffect, useState } from "react";
import { getAdminSocket } from "@/lib/socket";

interface LivePageStatsPayload {
  totalActive: number;
  pageCounts: Record<string, number>;
}

const TRACKED_ROUTES = [
  { route: "/delivery/portal", label: "Rider portal" },
  { route: "/track", label: "Tracking" },
  { route: "/cart", label: "Cart" },
  { route: "/checkout", label: "Checkout" },
  { route: "/products", label: "Products" },
  { route: "/", label: "Home" },
];

export default function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
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
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket = getAdminSocket();

    function handleStats(payload: LivePageStatsPayload) {
      setStats(payload);
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
    socket.on("live-page-visitors-stats", handleStats);

    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("request-live-page-stats");
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("live-page-visitors-stats", handleStats);
    };
  }, []);

  const total = stats.totalActive || 0;
  const counts = stats.pageCounts || {};

  return (
    <div className="flex flex-col gap-4 border-b border-line bg-white px-8 py-5 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink2">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
          title="Socket.IO Gateway Status (Port 6734)"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-600" : "bg-amber-600"}`}
          />
          <span>{total} live</span>
        </div>

        {TRACKED_ROUTES.map((item) => {
          const count = counts[item.route] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={item.route}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-[11px]"
            >
              <span className="text-ink2">{item.label}</span>
              <span className="font-medium text-ink">
                {count} <span className="font-normal text-ink2">·</span>{" "}
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
