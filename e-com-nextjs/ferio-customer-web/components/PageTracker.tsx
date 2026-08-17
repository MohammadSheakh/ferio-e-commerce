"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getCustomerSocket } from "@/lib/socket";

export default function PageTracker() {
  const pathname = usePathname();
  const socketRef = useRef<ReturnType<typeof getCustomerSocket> | null>(null);

  useEffect(() => {
    let savedGuestId = localStorage.getItem("ferio_chat_guest_id");
    if (!savedGuestId) {
      savedGuestId = `gst_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("ferio_chat_guest_id", savedGuestId);
    }

    const socket = getCustomerSocket(undefined, savedGuestId);
    socketRef.current = socket;

    function handleConnect() {
      socket.emit("page-view", { page: pathname });
    }

    if (socket.connected) {
      socket.emit("page-view", { page: pathname });
    } else {
      socket.on("connect", handleConnect);
    }

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
