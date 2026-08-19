import { io, Socket } from "socket.io-client";

const rawApiUrl = process.env.EXPO_PUBLIC_FERIO_API_URL || "http://192.168.0.110:6733";
const SOCKET_URL = rawApiUrl
  .replace(/\/api\/v1\/?$/, "")
  .replace(":6733", ":6734");

let socket: Socket | null = null;

export function getMobileSocket(token?: string, guestId?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
      auth: {
        token: token || "",
        guestId: guestId || "",
        role: "customer",
      },
    });
  } else {
    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      role: "customer",
      ...(token ? { token } : {}),
      ...(guestId ? { guestId } : {}),
    };
  }

  if (!socket.connected) {
    try {
      socket.connect();
    } catch {
      // Non-blocking catch
    }
  }

  return socket;
}

export function disconnectMobileSocket() {
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    socket = null;
  }
}
