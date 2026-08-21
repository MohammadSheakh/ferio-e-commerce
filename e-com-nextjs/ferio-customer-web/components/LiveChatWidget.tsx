"use client";

import { useEffect, useRef, useState } from "react";
import { getCustomerSocket } from "@/lib/socket";

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  time: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "agent",
    text: "Hi there! 👋 Welcome to Ferio Support.",
    time: "Just now",
  },
  {
    id: "2",
    sender: "agent",
    text: "How can I help you today?",
    time: "Just now",
  },
];

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [guestId, setGuestId] = useState<string>("");
  const [customerUser, setCustomerUser] = useState<{ id: string; userId?: string; name: string; email?: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketToken, setSocketToken] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getCustomerSocket> | null>(null);

  // Initialize or restore Customer User Profile / Guest ID / Saved Messages
  useEffect(() => {
    let savedGuestId = localStorage.getItem("ferio_chat_guest_id");
    if (!savedGuestId || !/^gst_[0-9a-f-]{36}$/i.test(savedGuestId)) {
      savedGuestId = `gst_${crypto.randomUUID()}`;
      localStorage.setItem("ferio_chat_guest_id", savedGuestId);
    }
    setGuestId(savedGuestId);

    // Fetch customer account session from Next.js server route
    async function initSession() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          const custObj = body.customer || body.data?.customer || body.account?.customer;
          const accObj = body.account || body.data?.account || (body.data?.id ? body.data : undefined);

          const resolvedId = custObj?.id || accObj?.customerId || accObj?.id || body.data?.id;
          const resolvedUserId = accObj?.id || body.data?.id;
          const resolvedName = custObj?.name || accObj?.name || body.data?.name || "Customer";
          const resolvedEmail = accObj?.email || custObj?.email || body.data?.email;

          if (resolvedId || accObj || custObj) {
            const userObj = {
              id: resolvedId || `acc_${Date.now()}`,
              userId: resolvedUserId,
              name: resolvedName !== "Customer" ? resolvedName : (resolvedEmail || "Customer"),
              email: resolvedEmail,
              avatar: accObj?.profileImageUrl || custObj?.avatar,
            };
            setCustomerUser(userObj);
            setIsLoggedIn(true);

            const savedMsgs = localStorage.getItem(`ferio_chat_history_${userObj.id}`);
            if (savedMsgs) {
              const parsed = JSON.parse(savedMsgs);
              if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
            }
            return;
          }
        }
      } catch {
        // Fallback
      }

      // Guest fallback
      setIsLoggedIn(false);
      const savedMsgs = localStorage.getItem(`ferio_chat_history_${savedGuestId}`);
      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    }

    void initSession();
  }, []);

  const activeUserId = customerUser?.id || guestId;
  const activeUserName = isLoggedIn
    ? (customerUser?.name && customerUser.name !== "Customer" ? customerUser.name : (customerUser?.email || "Member"))
    : (guestId ? `Guest Visitor #${guestId.replace("gst_", "")}` : "Guest Visitor");

  const customerUserRef = useRef(customerUser);
  const guestIdRef = useRef(guestId);

  useEffect(() => {
    customerUserRef.current = customerUser;
  }, [customerUser]);

  useEffect(() => {
    guestIdRef.current = guestId;
  }, [guestId]);

  useEffect(() => {
    if (!guestId) return;
    const refreshTicket = () => {
      fetch("/api/chat/socket-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      })
        .then((response) => response.json())
        .then((payload) => setSocketToken(payload.data?.token || ""))
        .catch(() => setSocketToken(""));
    };
    refreshTicket();
    const intervalId = window.setInterval(refreshTicket, 4 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [guestId, isLoggedIn]);

  // Connect to Socket.IO server and listen for real-time events
  useEffect(() => {
    if (!activeUserId || !socketToken) return;

    const convId = `conv-${activeUserId}`;
    const socket = getCustomerSocket(socketToken, activeUserId);
    socketRef.current = socket;

    const joinAllRooms = () => {
      socket.emit("join", { conversationId: convId });
      socket.emit("join", { conversationId: activeUserId });
      const currentCust = customerUserRef.current;
      const currentGuest = guestIdRef.current;

      if (currentCust?.id) {
        socket.emit("join", { conversationId: currentCust.id });
        socket.emit("join", { conversationId: `conv-${currentCust.id}` });
      }
      if (currentCust?.userId) {
        socket.emit("join", { conversationId: currentCust.userId });
        socket.emit("join", { conversationId: `conv-${currentCust.userId}` });
      }
      if (currentGuest) {
        socket.emit("join", { conversationId: currentGuest });
        socket.emit("join", { conversationId: `conv-${currentGuest}` });
      }
    };

    socket.on("connect", () => {
      setIsConnected(true);
      joinAllRooms();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new-message-received", (data: any) => {
      const targetConv = data.conversationId;
      const currentCust = customerUserRef.current;
      const currentGuest = guestIdRef.current;
      const custId = currentCust?.id;
      const usrId = currentCust?.userId;

      const matchConv =
        targetConv === convId ||
        targetConv === `conv-${activeUserId}` ||
        targetConv === activeUserId ||
        (custId && (targetConv === custId || targetConv === `conv-${custId}`)) ||
        (usrId && (targetConv === usrId || targetConv === `conv-${usrId}`)) ||
        data.targetUserId === activeUserId ||
        (custId && data.targetUserId === custId) ||
        (usrId && data.targetUserId === usrId) ||
        data.senderId === activeUserId ||
        (currentGuest && (targetConv === `conv-${currentGuest}` || targetConv === currentGuest || data.guestId === currentGuest)) ||
        Boolean(data.isAdmin);

      if (matchConv) {
        const isAgent = Boolean(
          data.isAdmin ||
          data.senderName?.toLowerCase().includes("support") ||
          data.senderName?.toLowerCase().includes("mohammad sheakh") ||
          data.senderId === "admin-current"
        );

        const newMsg: ChatMessage = {
          id: data._messageId || Date.now().toString(),
          sender: isAgent ? "agent" : "user",
          text: data.text,
          time: new Date(data.createdAt || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || (m.text === newMsg.text && m.sender === newMsg.sender))) {
            return prev;
          }
          return [...prev, newMsg];
        });

        if (isAgent) {
          setIsTyping(false);
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      }
    });

    if (socket.connected) {
      setIsConnected(true);
      joinAllRooms();
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new-message-received");
    };
  }, [activeUserId, guestId, isOpen, socketToken]);

  // Save messages to LocalStorage
  useEffect(() => {
    if (activeUserId && messages.length > 0) {
      try {
        localStorage.setItem(`ferio_chat_history_${activeUserId}`, JSON.stringify(messages));
      } catch {
        // Fallback
      }
    }
  }, [activeUserId, messages]);

  // Fetch DB chat history on mount/user identity resolution
  useEffect(() => {
    if (!activeUserId) return;

    const targetConvId = `conv-${activeUserId}`;
    async function loadDbHistory() {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(targetConvId)}`, {
          headers: { "x-chat-guest-id": guestId },
        });
        if (res.ok) {
          const json = await res.json();
          const rawMsgs = json.data?.results || [];

          if (rawMsgs.length > 0) {
            const formatted: ChatMessage[] = rawMsgs.map((m: any) => ({
              id: m.id,
              sender: m.sender?.role === "admin" ? "agent" : "user",
              text: m.text,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }));

            setMessages((prev) => {
              const existingIds = new Set(prev.map((item) => item.id));
              const newItems = formatted.filter((item) => !existingIds.has(item.id));
              if (newItems.length === 0) return prev;
              return [...prev, ...newItems];
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch DB message history for customer chat widget", err);
      }
    }

    loadDbHistory();
  }, [activeUserId, guestId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeUserId) return;

    const convId = `conv-${activeUserId}`;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");

    // Emit live event over Socket.IO gateway
    if (socketRef.current) {
      socketRef.current.emit("new-message-received", {
        _messageId: userMsg.id,
        conversationId: convId,
        guestId: isLoggedIn ? undefined : guestId,
        senderId: activeUserId,
        senderName: activeUserName,
        email: customerUser?.email,
        text: text,
        createdAt: new Date().toISOString(),
        isGuest: !isLoggedIn,
        isAdmin: false,
      });
    }

    setIsTyping(true);
    const timeoutId = setTimeout(() => {
      setIsTyping(false);
    }, 4000);

    return () => clearTimeout(timeoutId);
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Pop-up Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-line/80 bg-white shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="relative flex items-center justify-between bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 p-0.5 shadow-md">
                  <img
                    src="https://media.licdn.com/dms/image/v2/D5603AQF6xtEy4KLdJg/profile-displayphoto-scale_400_400/B56Z55.UopK8Ag-/0/1780162842990?e=1788393600&v=beta&t=T_Tp2ReUVsGhh4Ol2JiFjELLdUKmpsyV9WdN83wanA0"
                    alt="Mohammad - Support"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isConnected ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Mohammad Sheakh</h4>
                <p className="text-[11px] text-blue-100/90 font-medium">
                  Ferio Admin ·{" "}
                  <span className={isConnected ? "text-emerald-300 font-semibold" : "text-amber-200"}>
                    {isConnected ? "Connected" : "Connecting..."}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleToggle}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
              title="Close chat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Session Banner */}
          <div className={`${isLoggedIn ? "bg-emerald-50 text-emerald-900 border-emerald-200/80" : "bg-amber-50 text-amber-800 border-amber-200/80"} px-4 py-2 text-[11px] border-b flex items-center justify-between transition-colors`}>
            <span>
              💬 Chatting as <strong className="font-semibold">{activeUserName}</strong>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isLoggedIn ? "bg-emerald-200/80 text-emerald-800" : "bg-amber-100/80 text-amber-900"}`}>
              {isLoggedIn ? "Account Sync" : "Guest Mode"}
            </span>
          </div>

          {/* Messages Area */}
          <div className="h-[340px] overflow-y-auto bg-slate-50/60 p-4 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {msg.sender === "agent" && (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full overflow-hidden border border-blue-200">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D5603AQF6xtEy4KLdJg/profile-displayphoto-scale_400_400/B56Z55.UopK8Ag-/0/1780162842990?e=1788393600&v=beta&t=T_Tp2ReUVsGhh4Ol2JiFjELLdUKmpsyV9WdN83wanA0"
                      alt="Mohammad Sheakh"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${msg.sender === "user"
                    ? "rounded-br-xs bg-ink text-white"
                    : "rounded-bl-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-blue-500/10"
                    }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`mt-1 block text-[9px] ${msg.sender === "user" ? "text-slate-300 text-right" : "text-blue-100/80"
                      }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 flex-shrink-0 rounded-full overflow-hidden border border-blue-200">
                  <img
                    src="https://media.licdn.com/dms/image/v2/D5603AQF6xtEy4KLdJg/profile-displayphoto-scale_400_400/B56Z55.UopK8Ag-/0/1780162842990?e=1788393600&v=beta&t=T_Tp2ReUVsGhh4Ol2JiFjELLdUKmpsyV9WdN83wanA0"
                    alt="Mohammad Sheakh"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="rounded-2xl rounded-bl-xs bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 delay-150" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 delay-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Chips */}
            {messages.length <= 2 && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick help:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "📦 Track my order",
                    "🚚 Delivery details",
                    "🔄 Return policy",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleQuickPrompt(chip)}
                      className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-600 hover:text-white shadow-xs font-medium"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="border-t border-slate-200/80 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
            >
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition"
                title="Attach file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 shadow-md ${!inputMessage.trim() ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                  }`}
                title="Send message"
              >
                <svg className="h-4 w-4 transform rotate-90 stroke-current" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={handleToggle}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-blue-700 active:scale-95"
        aria-label="Open support chat"
      >
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}

        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <div className="relative flex items-center justify-center">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
}
