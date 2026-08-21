import { io, Socket } from "socket.io-client";

const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_FERIO_API_URL || "http://localhost:6734";
const SOCKET_URL = rawSocketUrl.replace(/\/api\/v1\/?$/, "").replace(":6733", ":6734");

let socket: Socket | null = null;

export function getCustomerSocket(token?: string, guestId?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: {
        token: token || "",
        guestId: guestId || "",
      },
      query: {
        guestId: guestId || "",
        page: typeof window !== "undefined" ? window.location.pathname : "/",
      },
    });
  } else {
    const previousToken =
      typeof socket.auth === "object" && "token" in socket.auth
        ? socket.auth.token
        : "";
    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      token: token || "",
      ...(guestId ? { guestId } : {}),
    };

    if (socket.connected && token && previousToken !== token) {
      socket.disconnect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectCustomerSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
