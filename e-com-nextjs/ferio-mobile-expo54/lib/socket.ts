import { io, Socket } from "socket.io-client";

// The backend URL must be provided via environment configuration. No
// developer-LAN fallback: an unset variable should fail loudly in development,
// not silently point at someone's machine.
const rawApiUrl = process.env.EXPO_PUBLIC_FERIO_API_URL;
if (!rawApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_FERIO_API_URL is required (e.g. http://192.168.1.10:6733 for local development).",
  );
}
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
      },
    });
  } else {
    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      token: token || "",
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
