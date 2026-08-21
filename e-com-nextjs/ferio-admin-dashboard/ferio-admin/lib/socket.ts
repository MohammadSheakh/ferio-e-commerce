import { io, Socket } from "socket.io-client";

const rawSocketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.FERIO_API_URL ||
  "http://localhost:6734";
const SOCKET_URL = rawSocketUrl
  .replace(/\/api\/v1\/?$/, "")
  .replace(":6733", ":6734");

let socket: Socket | null = null;
let currentToken: string | null = null;
let isFetchingToken = false;

export function getAdminSocket(token?: string): Socket {
  if (token && token !== currentToken) {
    currentToken = token;
    if (socket) {
      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    }
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: {
        token: currentToken || token || "",
      },
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  // Auto-fetch socket authentication ticket if token is missing
  if (!currentToken && !token && !isFetchingToken && typeof window !== "undefined") {
    isFetchingToken = true;
    fetch("/api/chat/socket-ticket", { method: "POST", cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.data?.token) {
          currentToken = payload.data.token;
          if (socket) {
            socket.auth = { token: currentToken };
            socket.disconnect();
            socket.connect();
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to auto-fetch socket token", err);
      })
      .finally(() => {
        isFetchingToken = false;
      });
  }

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
