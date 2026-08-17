"use client";

import { useEffect, useState } from "react";
import { getAdminSocket } from "@/lib/socket";

interface LivePageStatsPayload {
  totalActive: number;
  pageCounts: Record<string, number>;
}

const TRACKED_ROUTES = [
  { route: "/track", label: "/track", icon: "🚚" },
  { route: "/cart", label: "/cart", icon: "🛒" },
  { route: "/checkout", label: "/checkout", icon: "💳" },
  { route: "/products", label: "/products", icon: "📦" },
  { route: "/", label: "/", icon: "🏠" },
];

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [stats, setStats] = useState<LivePageStatsPayload>({
    totalActive: 0,
    pageCounts: {
      "/": 0,
      "/cart": 0,
      "/checkout": 0,
      "/track": 0,
      "/products": 0,
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
    <div className="flex flex-col gap-4 border-b border-line px-8 py-5 xl:flex-row xl:items-center xl:justify-between bg-white">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink2">{subtitle}</p>}
      </div>

      {/* Top Right Real-Time Visitor Pills in Oval Shape */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Live indicator pill */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border shrink-0 transition ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
          title="Socket.IO Gateway Status (Port 6734)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{total} Live</span>
        </div>

        {/* Route Pills in Oval Shape */}
        {TRACKED_ROUTES.map((item) => {
          const count = counts[item.route] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={item.route}
              className="flex items-center gap-1.5 rounded-full bg-[#18181b] text-white px-3.5 py-1 text-[11px] font-medium shadow-xs border border-slate-800 shrink-0 transition hover:bg-black"
            >
              <span className="text-[12px]">{item.icon}</span>
              <span className="text-slate-300 font-mono">{item.label}</span>
              <span className="font-semibold text-white">
                {count} <span className="text-slate-400 font-normal">|</span> {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
