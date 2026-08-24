import { io, Socket } from "socket.io-client";

function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (process.env.NEXT_PUBLIC_FERIO_API_URL) {
    return process.env.NEXT_PUBLIC_FERIO_API_URL.replace(/\/api\/v1\/?$/, "").replace(":6733", ":6734");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      // In production/tunnel domain (e.g. ferio.sheakh.qzz.io), use relative or origin socket endpoint
      // to avoid triggering browser Local Network Access (LNA) permissions popup to http://localhost
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      return `${protocol}//${window.location.host}`;
    }
  }
  return "http://localhost:6734";
}

let socket: Socket | null = null;

export function getCustomerSocket(token?: string, guestId?: string): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
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
