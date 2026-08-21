"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getCustomerSocket } from "@/lib/socket";
import { createBrowserUuid } from "@/lib/browser-uuid";

export default function PageTracker() {
  const pathname = usePathname();
  const socketRef = useRef<ReturnType<typeof getCustomerSocket> | null>(null);

  useEffect(() => {
    let savedGuestId = localStorage.getItem("ferio_chat_guest_id");
    if (!savedGuestId || !/^gst_[0-9a-f-]{36}$/i.test(savedGuestId)) {
      savedGuestId = `gst_${createBrowserUuid()}`;
      localStorage.setItem("ferio_chat_guest_id", savedGuestId);
    }

    const savedRiderToken = localStorage.getItem("ferio_rider_token") || undefined;
    const socket = getCustomerSocket(savedRiderToken, savedGuestId);
    socketRef.current = socket;

    function handleConnect() {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : pathname;
      socket.emit("page-view", { page: currentPath });
    }

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("page-view", { page: pathname });
    }

    // Periodic heartbeat to maintain live visitor state for riders/customers
    const interval = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : pathname;
        socketRef.current.emit("page-view", { page: currentPath });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
