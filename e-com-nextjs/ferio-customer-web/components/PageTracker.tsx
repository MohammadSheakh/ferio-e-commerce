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

    const socket = getCustomerSocket(undefined, savedGuestId);
    socketRef.current = socket;

    function handleConnect() {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
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
  }, [pathname]);

  return null;
}
