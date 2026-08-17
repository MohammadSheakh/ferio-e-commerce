"use client";

import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";
import { getAdminSocket } from "@/lib/socket";
import type { CustomerListItem } from "@/lib/customers";

export type ChatFolderStatus = "ACTIVE" | "ARCHIVED" | "FAKE" | "FRAUD" | "DELETED";
export type PrimaryFolderTab = "ALL" | "FAVORITE" | "PROMISING" | "ARCHIVED" | "FAKE" | "FRAUD" | "DELETED";
export type SubTypeFilter = "ALL" | "LOGGED_IN" | "GUEST" | "UNREAD";

interface ChatParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isGuest: boolean;
  guestId?: string;
  isOnline: boolean;
  lastSeen?: string;
  totalOrders?: number;
}

interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  text: string;
  timestamp: string;
  status: "SENT" | "DELIVERED" | "READ";
}

interface Conversation {
  id: string;
  customer: ChatParticipant;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: MessageItem[];
  folder: ChatFolderStatus;
  isFavorite: boolean;
  isPromising: boolean;
}

export default function AdminLiveChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [primaryTab, setPrimaryTab] = useState<PrimaryFolderTab>("ALL");
  const [subFilter, setSubFilter] = useState<SubTypeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
  const [openMenuConvId, setOpenMenuConvId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getAdminSocket> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConvId, activeConv?.messages]);

  // Load saved metadata (folder status, favorites, promising) from localStorage
  const getSavedMetadata = (): Record<string, { folder?: ChatFolderStatus; isFavorite?: boolean; isPromising?: boolean }> => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem("ferio_admin_chat_metadata");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveMetadata = (convId: string, meta: { folder?: ChatFolderStatus; isFavorite?: boolean; isPromising?: boolean }) => {
    if (typeof window === "undefined") return;
    try {
      const current = getSavedMetadata();
      const updated = {
        ...current,
        [convId]: {
          ...current[convId],
          ...meta,
        },
      };
      localStorage.setItem("ferio_admin_chat_metadata", JSON.stringify(updated));
    } catch {
      // Fallback
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuConvId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real registered customers and DB stored conversations (including guest visitors) on mount
  useEffect(() => {
    async function loadCustomers() {
      try {
        const [resCust, resConvs] = await Promise.all([
          fetch("/api/customers?limit=50"),
          fetch("/api/chat/conversations"),
        ]);

        let items: CustomerListItem[] = [];
        if (resCust.ok) {
          const json = await resCust.ok ? await resCust.json() : {};
          items = json.data?.items || [];
        }

        let dbConvs: any[] = [];
        if (resConvs.ok) {
          const json = await resConvs.json();
          dbConvs = json.data?.results || [];
        }

        const metaStore = getSavedMetadata();

        setConversations((prev) => {
          const map = new Map<string, Conversation>();
          prev.forEach((c) => map.set(c.id, c));

          // 1. Add registered customers
          items.forEach((cust) => {
            const convId = `conv-${cust.id}`;
            const savedMeta = metaStore[convId] || metaStore[cust.id] || {};
            if (!map.has(convId)) {
              map.set(convId, {
                id: convId,
                customer: {
                  id: cust.id,
                  name: cust.name,
                  email: cust.email || undefined,
                  phone: cust.phone,
                  avatar: cust.avatarUrl || undefined,
                  isGuest: false,
                  isOnline: false,
                  totalOrders: cust.totalOrderCount,
                },
                lastMessage: "No recent messages",
                lastMessageTime: cust.lastOnlineAt
                  ? new Date(cust.lastOnlineAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Offline",
                unreadCount: 0,
                messages: [],
                folder: savedMeta.folder || "ACTIVE",
                isFavorite: savedMeta.isFavorite || false,
                isPromising: savedMeta.isPromising || false,
              });
            }
          });

          // 2. Add DB conversations (especially guest visitor conversations)
          dbConvs.forEach((conv: any) => {
            const convId = conv.id.startsWith("conv-") ? conv.id : `conv-${conv.id}`;
            const rawId = conv.id.replace("conv-", "");
            
            const isGuestConv = rawId.startsWith("gst_") || conv.id.startsWith("conv-gst_") || rawId.startsWith("guest");
            
            if (isGuestConv) {
              const guestId = rawId.startsWith("gst_") ? rawId : (conv.id.includes("gst_") ? conv.id.split("conv-")[1] : rawId);
              const savedMeta = metaStore[convId] || metaStore[guestId] || {};
              const formattedTime = conv.lastMessageAt
                ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recent";

              const existing = map.get(convId);
              if (existing) {
                existing.lastMessage = conv.lastMessage || existing.lastMessage;
                existing.lastMessageTime = formattedTime;
              } else {
                map.set(convId, {
                  id: convId,
                  customer: {
                    id: guestId,
                    name: `Guest Visitor #${guestId.replace("gst_", "")}`,
                    isGuest: true,
                    guestId: guestId,
                    isOnline: false,
                  },
                  lastMessage: conv.lastMessage || "Guest message",
                  lastMessageTime: formattedTime,
                  unreadCount: 0,
                  messages: [],
                  folder: savedMeta.folder || "ACTIVE",
                  isFavorite: savedMeta.isFavorite || false,
                  isPromising: savedMeta.isPromising || false,
                });
              }
            } else {
              const existing = map.get(convId) || map.get(`conv-${rawId}`);
              if (existing) {
                existing.lastMessage = conv.lastMessage || existing.lastMessage;
                if (conv.lastMessageAt) {
                  existing.lastMessageTime = new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                }
              }
            }
          });

          const merged = Array.from(map.values());
          if (!activeConvId && merged.length > 0) {
            setActiveConvId(merged[0].id);
          }
          return merged;
        });
      } catch (err) {
        console.warn("Failed to load customer profiles and DB conversations for chat sidebar", err);
      } finally {
        setIsLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  // Socket Connection and Real-Time Event Handling
  useEffect(() => {
    const socket = getAdminSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (activeConvId) {
        socket.emit("join", { conversationId: activeConvId });
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Handle real-time incoming messages from any customer / room
    socket.on("new-message-received", (data: any) => {
      const { conversationId, text, senderId, senderName, email, isGuest, guestId, isAdmin } = data || {};
      if (!text) return;

      const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const isFromAdmin = Boolean(
        isAdmin || senderId === "admin-current" || String(senderId).startsWith("admin")
      );

      setConversations((prev) => {
        const targetConvId = conversationId || (guestId ? `conv-${guestId}` : `conv-${senderId || "guest"}`);
        const metaStore = getSavedMetadata();

        // Match existing conversation by ID, customer ID, guestId, or email
        const existingConvIndex = prev.findIndex(
          (c) =>
            c.id === targetConvId ||
            c.id === conversationId ||
            (senderId && c.customer.id === senderId) ||
            (guestId && c.customer.guestId === guestId) ||
            (email && c.customer.email && c.customer.email.toLowerCase() === email.toLowerCase()) ||
            (senderName && !isFromAdmin && c.customer.name.toLowerCase() === String(senderName).toLowerCase())
        );

        const newMsgItem: MessageItem = {
          id: data._messageId || `msg-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: senderId || (isFromAdmin ? "admin-current" : "customer"),
          senderName: senderName || (isFromAdmin ? "Henry (Support Agent)" : isGuest ? `Guest Visitor #${guestId || "8921"}` : "Customer"),
          isAdmin: isFromAdmin,
          text: text,
          timestamp: formattedTime,
          status: "DELIVERED",
        };

        if (existingConvIndex !== -1) {
          const existingConv = prev[existingConvIndex];
          const isDuplicate = existingConv.messages.some(
            (m) => m.id === newMsgItem.id || (m.text === text && m.isAdmin === isFromAdmin)
          );

          const updatedMessages = isDuplicate ? existingConv.messages : [...existingConv.messages, newMsgItem];
          const updatedConv: Conversation = {
            ...existingConv,
            id: targetConvId,
            customer: {
              ...existingConv.customer,
              id: senderId && !senderId.startsWith("admin") ? senderId : existingConv.customer.id,
              name: senderName && !isFromAdmin ? senderName : existingConv.customer.name,
              email: email || existingConv.customer.email,
              isGuest: isGuest ?? existingConv.customer.isGuest,
              guestId: guestId || existingConv.customer.guestId,
              isOnline: true,
            },
            lastMessage: text,
            lastMessageTime: formattedTime,
            unreadCount: isFromAdmin || existingConv.id === activeConvId ? 0 : existingConv.unreadCount + 1,
            messages: updatedMessages,
          };

          const nextList = [...prev];
          nextList.splice(existingConvIndex, 1);
          return [updatedConv, ...nextList];
        } else {
          // Dynamically create a new conversation thread for incoming live guest/customer
          const savedMeta = metaStore[targetConvId] || {};
          const newConv: Conversation = {
            id: targetConvId,
            customer: {
              id: senderId || guestId || `gst_${Date.now()}`,
              name: senderName || (guestId ? `Guest Visitor #${guestId}` : "New Visitor"),
              email: email,
              isGuest: isGuest ?? true,
              guestId: guestId,
              isOnline: true,
              lastSeen: "Just now",
            },
            lastMessage: text,
            lastMessageTime: formattedTime,
            unreadCount: isFromAdmin ? 0 : 1,
            messages: [newMsgItem],
            folder: savedMeta.folder || "ACTIVE",
            isFavorite: savedMeta.isFavorite || false,
            isPromising: savedMeta.isPromising || false,
          };

          if (!activeConvId) {
            setActiveConvId(targetConvId);
          }
          return [newConv, ...prev];
        }
      });
    });

    if (socket.connected) {
      setIsConnected(true);
      if (activeConvId) {
        socket.emit("join", { conversationId: activeConvId });
      }
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new-message-received");
    };
  }, [activeConvId]);

  // Load message history from DB when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    async function fetchMessageHistory() {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(activeConvId)}`);
        if (res.ok) {
          const json = await res.json();
          const rawMsgs = json.data?.results || [];

          if (rawMsgs.length > 0) {
            const currentConv = conversations.find((c) => c.id === activeConvId);
            const customerId = currentConv?.customer.id;
            const guestId = currentConv?.customer.guestId;

            const formatted: MessageItem[] = rawMsgs.map((m: any) => {
              const isCustomerSender =
                (customerId && (m.senderId === customerId || m.senderId === `conv-${customerId}`)) ||
                (guestId && (m.senderId === guestId || m.senderId === `conv-${guestId}`));

              const isFromAdmin = !isCustomerSender && Boolean(
                m.sender?.role === "admin" ||
                m.sender?.role === "SUPER_ADMIN" ||
                m.senderId === "admin-current" ||
                String(m.senderId).startsWith("admin")
              );

              return {
                id: m.id,
                senderId: m.senderId,
                senderName: isFromAdmin
                  ? (m.sender?.name || "Henry (Support Agent)")
                  : (currentConv?.customer.name || m.sender?.name || "Customer"),
                isAdmin: isFromAdmin,
                text: m.text,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                status: "DELIVERED",
              };
            });

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === activeConvId) {
                  return {
                    ...c,
                    messages: formatted,
                    lastMessage: formatted[formatted.length - 1]?.text || c.lastMessage,
                    lastMessageTime: formatted[formatted.length - 1]?.timestamp || c.lastMessageTime,
                  };
                }
                return c;
              })
            );
          }
        }
      } catch (err) {
        console.warn("Failed to load message history from backend DB", err);
      }
    }

    fetchMessageHistory();
  }, [activeConvId]);

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );

    if (socketRef.current) {
      const selectedConv = conversations.find((c) => c.id === id);
      socketRef.current.emit("join", { conversationId: id });
      if (selectedConv?.customer.id) {
        socketRef.current.emit("join", { conversationId: selectedConv.customer.id });
        socketRef.current.emit("join", { conversationId: `conv-${selectedConv.customer.id}` });
      }
      if (selectedConv?.customer.guestId) {
        socketRef.current.emit("join", { conversationId: selectedConv.customer.guestId });
        socketRef.current.emit("join", { conversationId: `conv-${selectedConv.customer.guestId}` });
      }
    }
  };

  const handleSendReply = (customText?: string) => {
    const text = (customText || replyText).trim();
    if (!text || !activeConv) return;

    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: MessageItem = {
      id: `m-${Date.now()}`,
      senderId: "admin-current",
      senderName: "Henry (Support Agent)",
      isAdmin: true,
      text: text,
      timestamp: formattedTime,
      status: "SENT",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: "Just now",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    if (socketRef.current) {
      const targetRoom = activeConv.id.startsWith("conv-") ? activeConv.id : `conv-${activeConv.id}`;
      socketRef.current.emit("new-message-received", {
        _messageId: newMsg.id,
        conversationId: targetRoom,
        targetUserId: activeConv.customer.id,
        email: activeConv.customer.email,
        guestId: activeConv.customer.guestId,
        senderId: "admin-current",
        senderName: "Henry (Support Agent)",
        text: text,
        createdAt: new Date().toISOString(),
        isAdmin: true,
      });

      socketRef.current.emit("join", { conversationId: targetRoom });
      socketRef.current.emit("join", { conversationId: activeConv.customer.id });
    }

    if (!customText) setReplyText("");
  };

  // Menu action handlers
  const handleUpdateStatus = (
    convId: string,
    updates: { folder?: ChatFolderStatus; isFavorite?: boolean; isPromising?: boolean }
  ) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updated = {
            ...c,
            folder: updates.folder !== undefined ? updates.folder : c.folder,
            isFavorite: updates.isFavorite !== undefined ? updates.isFavorite : c.isFavorite,
            isPromising: updates.isPromising !== undefined ? updates.isPromising : c.isPromising,
          };
          saveMetadata(convId, {
            folder: updated.folder,
            isFavorite: updated.isFavorite,
            isPromising: updated.isPromising,
          });
          return updated;
        }
        return c;
      })
    );
    setOpenMenuConvId(null);
  };

  // Filter conversations based on Primary Tab & Sub Filter
  const filteredConversations = conversations.filter((c) => {
    // 1. Primary Tab Filtering Rules
    if (primaryTab === "ALL") {
      if (c.folder !== "ACTIVE") return false;
    } else if (primaryTab === "FAVORITE") {
      if (!c.isFavorite || c.folder === "DELETED") return false;
    } else if (primaryTab === "PROMISING") {
      if (!c.isPromising || c.folder === "DELETED") return false;
    } else if (primaryTab === "ARCHIVED") {
      if (c.folder !== "ARCHIVED") return false;
    } else if (primaryTab === "FAKE") {
      if (c.folder !== "FAKE") return false;
    } else if (primaryTab === "FRAUD") {
      if (c.folder !== "FRAUD") return false;
    } else if (primaryTab === "DELETED") {
      if (c.folder !== "DELETED") return false;
    }

    // 2. Sub Type Filtering
    if (subFilter === "LOGGED_IN" && c.customer.isGuest) return false;
    if (subFilter === "GUEST" && !c.customer.isGuest) return false;
    if (subFilter === "UNREAD" && c.unreadCount === 0) return false;

    // 3. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customer.name.toLowerCase().includes(q) ||
        (c.customer.email && c.customer.email.toLowerCase().includes(q)) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <Topbar title="Live Chat" subtitle="Real-time Customer Support & Conversation Desk" />

      <div className="p-8">
        <div className="flex h-[calc(100vh-170px)] min-h-[600px] overflow-hidden rounded-card border border-line bg-white shadow-xs">
          {/* Left Panel: Conversation List */}
          <div className="flex w-88 flex-col border-r border-line bg-surface/40">
            {/* Primary Category Folders Header Bar */}
            <div className="border-b border-line bg-white px-3 py-2.5">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "ALL", label: "Inbox", icon: "💬" },
                  { id: "FAVORITE", label: "Favorites", icon: "★" },
                  { id: "PROMISING", label: "Promising", icon: "⭐" },
                  { id: "ARCHIVED", label: "Archive", icon: "📥" },
                  { id: "FAKE", label: "Fake", icon: "⚠️" },
                  { id: "FRAUD", label: "Fraud", icon: "🚫" },
                  { id: "DELETED", label: "Trash", icon: "🗑️" },
                ].map((tab) => {
                  const count = conversations.filter((c) => {
                    if (tab.id === "ALL") return c.folder === "ACTIVE";
                    if (tab.id === "FAVORITE") return c.isFavorite && c.folder !== "DELETED";
                    if (tab.id === "PROMISING") return c.isPromising && c.folder !== "DELETED";
                    if (tab.id === "ARCHIVED") return c.folder === "ARCHIVED";
                    if (tab.id === "FAKE") return c.folder === "FAKE";
                    if (tab.id === "FRAUD") return c.folder === "FRAUD";
                    if (tab.id === "DELETED") return c.folder === "DELETED";
                    return true;
                  }).length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPrimaryTab(tab.id as PrimaryFolderTab)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                        primaryTab === tab.id
                          ? "bg-ink text-white shadow-xs"
                          : "bg-surface/60 text-ink2 hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <span className="text-[12px]">{tab.icon}</span>
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span
                          className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                            primaryTab === tab.id ? "bg-white/20 text-white" : "bg-line/70 text-ink"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Sub Filter Bar */}
            <div className="p-3 space-y-2 border-b border-line bg-surface/20">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers or messages..."
                className="w-full rounded-md border border-line bg-white px-3 py-1.5 text-[12px] outline-none focus:border-ink"
              />

              <div className="flex flex-wrap gap-1">
                {(["ALL", "LOGGED_IN", "GUEST", "UNREAD"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSubFilter(tab)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                      subFilter === tab
                        ? "bg-ink text-white"
                        : "bg-white text-ink2 border border-line hover:text-ink"
                    }`}
                  >
                    {tab === "ALL"
                      ? "All Types"
                      : tab === "LOGGED_IN"
                      ? "Logged-in"
                      : tab === "GUEST"
                      ? "Guests"
                      : "Unread"}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-line/60">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const isMenuOpen = openMenuConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-start gap-3 p-3.5 transition cursor-pointer ${
                      isActive ? "bg-white shadow-xs border-l-4 border-l-ink" : "hover:bg-white/60"
                    }`}
                    onClick={() => handleSelectConv(conv.id)}
                  >
                    <div className="relative shrink-0">
                      {conv.customer.avatar ? (
                        <img
                          src={conv.customer.avatar}
                          alt={conv.customer.name}
                          className="h-10 w-10 rounded-full object-cover border border-line"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                          {conv.customer.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          conv.customer.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 max-w-[140px] truncate">
                          <h4 className="truncate text-[13px] font-semibold text-ink">
                            {conv.customer.name}
                          </h4>
                          {conv.isFavorite && <span className="text-amber-500 text-[11px]">★</span>}
                          {conv.isPromising && <span className="text-emerald-500 text-[11px]">⭐</span>}
                        </div>
                        <span className="text-[10px] text-ink2 shrink-0">{conv.lastMessageTime}</span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-semibold shrink-0 ${
                            conv.customer.isGuest
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {conv.customer.isGuest ? "GUEST" : "CUSTOMER"}
                        </span>

                        {conv.folder === "ARCHIVED" && (
                          <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700">
                            ARCHIVE
                          </span>
                        )}
                        {conv.folder === "FAKE" && (
                          <span className="rounded bg-amber-200 px-1 py-0.2 text-[9px] font-bold text-amber-900">
                            FAKE
                          </span>
                        )}
                        {conv.folder === "FRAUD" && (
                          <span className="rounded bg-rose-200 px-1 py-0.2 text-[9px] font-bold text-rose-900">
                            FRAUD
                          </span>
                        )}
                        {conv.folder === "DELETED" && (
                          <span className="rounded bg-red-200 px-1 py-0.2 text-[9px] font-bold text-red-900">
                            TRASH
                          </span>
                        )}

                        <p className="truncate text-[11px] text-ink2 flex-1">{conv.lastMessage}</p>
                      </div>
                    </div>

                    {/* Unread badge & 3-Dot Action Menu Button */}
                    <div className="absolute right-3 top-3.5 flex flex-col items-end gap-1">
                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuConvId((prev) => (prev === conv.id ? null : conv.id));
                        }}
                        className="rounded p-1 text-ink2 hover:bg-slate-200 hover:text-ink transition"
                        title="Chat Options"
                      >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 16 16">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                    </div>

                    {/* Dropdown Action Menu */}
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className="absolute right-3 top-10 z-50 w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 text-[12px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleUpdateStatus(conv.id, { isPromising: !conv.isPromising })}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 transition"
                        >
                          <span>⭐</span>
                          <span>{conv.isPromising ? "Remove Promising Tag" : "Mark as Promising"}</span>
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(conv.id, { isFavorite: !conv.isFavorite })}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 transition"
                        >
                          <span>★</span>
                          <span>{conv.isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
                        </button>

                        <div className="my-1 border-t border-line" />

                        {conv.folder !== "ARCHIVED" ? (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "ARCHIVED" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-100 transition"
                          >
                            <span>📥</span>
                            <span>Archive Chat</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "ACTIVE" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <span>📬</span>
                            <span>Unarchive (Move to Inbox)</span>
                          </button>
                        )}

                        {conv.folder !== "FAKE" ? (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "FAKE" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-amber-700 hover:bg-amber-50 transition"
                          >
                            <span>⚠️</span>
                            <span>Mark as Fake Visitor</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "ACTIVE" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <span>🔄</span>
                            <span>Restore from Fake</span>
                          </button>
                        )}

                        {conv.folder !== "FRAUD" ? (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "FRAUD" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-700 hover:bg-rose-50 transition"
                          >
                            <span>🚫</span>
                            <span>Mark as Fraud Account</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "ACTIVE" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <span>🔄</span>
                            <span>Restore from Fraud</span>
                          </button>
                        )}

                        <div className="my-1 border-t border-line" />

                        {conv.folder !== "DELETED" ? (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "DELETED" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50 transition font-medium"
                          >
                            <span>🗑️</span>
                            <span>Soft Delete Chat</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(conv.id, { folder: "ACTIVE" })}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 transition font-medium"
                          >
                            <span>♻️</span>
                            <span>Restore from Trash</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="p-8 text-center text-[12px] text-ink2 space-y-1">
                  <p className="font-semibold text-ink">No conversations in {primaryTab}</p>
                  <p>
                    {isLoadingCustomers
                      ? "Loading customer directory..."
                      : "Chats marked with this status will appear here."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Center Panel: Active Chat Thread */}
          {activeConv ? (
            <div className="flex flex-1 flex-col bg-white">
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {activeConv.customer.avatar ? (
                      <img
                        src={activeConv.customer.avatar}
                        alt={activeConv.customer.name}
                        className="h-10 w-10 rounded-full object-cover border border-line"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                        {activeConv.customer.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                        activeConv.customer.isOnline ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-ink">
                        {activeConv.customer.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          activeConv.customer.isGuest
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {activeConv.customer.isGuest ? "Guest Visitor" : "Registered Customer"}
                      </span>

                      {activeConv.isFavorite && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                          ★ Favorite
                        </span>
                      )}
                      {activeConv.isPromising && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                          ⭐ Promising Lead
                        </span>
                      )}
                      {activeConv.folder !== "ACTIVE" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-300">
                          {activeConv.folder}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-ink2">
                      {activeConv.customer.isOnline ? (
                        <span className="text-emerald-600 font-medium">● Connected via Socket.IO Gateway</span>
                      ) : (
                        `Offline · Last active ${activeConv.customer.lastSeen || "recently"}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-3 py-1 rounded-full border font-medium ${
                    isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {isConnected ? "● Socket / Redis Gateway Live" : "Connecting Gateway..."}
                  </span>
                </div>
              </div>

              {/* Message Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {activeConv.messages.length > 0 ? (
                  activeConv.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isAdmin ? "items-end" : "items-start"}`}
                    >
                      <span className="mb-1 text-[10px] text-ink2 font-medium">
                        {msg.senderName} · {msg.timestamp}
                      </span>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-xs ${
                          msg.isAdmin
                            ? "bg-ink text-white rounded-br-xs"
                            : "bg-white text-ink border border-line/80 rounded-bl-xs"
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center text-[12px] text-ink2">
                    No message history yet for {activeConv.customer.name}. Send a message to initiate chat!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Response Shortcuts */}
              <div className="border-t border-line/60 bg-surface/30 px-6 py-2 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] text-ink2 font-medium shrink-0">Quick Reply:</span>
                {[
                  "Hello! How can I assist you with your order today?",
                  "Delivery takes 24-48 hours in Dhaka Metro.",
                  "Cash on Delivery is available across Bangladesh!",
                  "Let me check your order details right now.",
                ].map((template) => (
                  <button
                    key={template}
                    onClick={() => handleSendReply(template)}
                    className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-[11px] text-ink2 hover:border-ink hover:text-ink transition"
                  >
                    {template}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="border-t border-line p-4 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Type your reply to ${activeConv.customer.name}...`}
                    className="flex-1 rounded-full border border-line bg-surface/40 px-5 py-2.5 text-[13px] outline-none focus:border-ink focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40 transition"
                  >
                    Send Reply
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-ink2 text-xs">
              Select a conversation to start chatting.
            </div>
          )}

          {/* Right Panel: Customer Meta Info */}
          {activeConv && (
            <div className="w-72 border-l border-line p-6 bg-surface/20 space-y-6 hidden lg:block">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
                  Customer Profile
                </h4>
                <div className="mt-3 flex items-center gap-3">
                  {activeConv.customer.avatar ? (
                    <img
                      src={activeConv.customer.avatar}
                      alt={activeConv.customer.name}
                      className="h-12 w-12 rounded-full object-cover border border-line"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                      {activeConv.customer.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink truncate">{activeConv.customer.name}</p>
                    <p className="text-[11px] text-ink2 truncate">
                      {activeConv.customer.email || "No email linked"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-line">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
                  Account Details & Tags
                </h4>

                <div className="rounded-card border border-line bg-white p-3 space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-ink2">Status Folder:</span>
                    <span className="font-semibold text-ink">{activeConv.folder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink2">Favorite:</span>
                    <span className="font-medium text-amber-700">{activeConv.isFavorite ? "Yes (★)" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink2">Promising Lead:</span>
                    <span className="font-medium text-emerald-700">{activeConv.isPromising ? "Yes (⭐)" : "No"}</span>
                  </div>
                  {activeConv.customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-ink2">Phone:</span>
                      <span className="font-medium text-ink">{activeConv.customer.phone}</span>
                    </div>
                  )}
                  {activeConv.customer.guestId && (
                    <div className="flex justify-between">
                      <span className="text-ink2">Guest ID:</span>
                      <span className="font-mono text-[10px] text-amber-700 font-medium">
                        {activeConv.customer.guestId}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink2">Total Orders:</span>
                    <span className="font-medium text-ink">
                      {activeConv.customer.totalOrders ?? 0} orders
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-line space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
                  Management Options
                </h4>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleUpdateStatus(activeConv.id, { isFavorite: !activeConv.isFavorite })}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink hover:bg-surface text-left flex items-center justify-between"
                  >
                    <span>Toggle Favorite</span>
                    <span>{activeConv.isFavorite ? "★" : "☆"}</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(activeConv.id, { isPromising: !activeConv.isPromising })}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink hover:bg-surface text-left flex items-center justify-between"
                  >
                    <span>Toggle Promising</span>
                    <span>{activeConv.isPromising ? "⭐" : "☆"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
