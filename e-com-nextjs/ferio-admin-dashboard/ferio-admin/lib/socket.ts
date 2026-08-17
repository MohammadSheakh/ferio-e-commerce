import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:6733";

let socket: Socket | null = null;

export function getAdminSocket(token?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: {
        token: token || "",
        role: "admin",
      },
      query: {
        role: "admin",
      },
    });
  } else {
    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      role: "admin",
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
