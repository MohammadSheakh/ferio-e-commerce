import { io, Socket } from "socket.io-client";

const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.FERIO_API_URL || "http://localhost:6734";
const SOCKET_URL = rawSocketUrl.replace(/\/api\/v1\/?$/, "").replace(":6733", ":6734");

let socket: Socket | null = null;

export function getAdminSocket(token?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: {
        token: token || "",
      },
    });
  } else {
    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      ...(token ? { token } : {}),
    };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
