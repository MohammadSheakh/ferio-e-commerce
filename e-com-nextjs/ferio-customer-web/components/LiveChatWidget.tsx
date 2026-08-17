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
  const [customerUser, setCustomerUser] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getCustomerSocket> | null>(null);

  // Initialize or restore Customer User Profile / Guest ID / Saved Messages
  useEffect(() => {
    let savedGuestId = localStorage.getItem("ferio_chat_guest_id");
    if (!savedGuestId) {
      savedGuestId = `gst_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("ferio_chat_guest_id", savedGuestId);
    }
    setGuestId(savedGuestId);

    // Fetch customer account session from Next.js server route
    async function initSession() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          const acc = body.account || body.customer || body.data?.account || body.data?.customer;
          if (acc && (acc.id || acc.userId)) {
            const userObj = {
              id: acc.id || acc.userId,
              name: acc.name || "Customer",
              email: acc.email,
              avatar: acc.profileImageUrl || acc.avatar,
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
  const activeUserName = customerUser?.name || (guestId ? `Guest Visitor #${guestId.replace("gst_", "")}` : "Guest Visitor");

  // Connect to Socket.IO server and listen for real-time events
  useEffect(() => {
    if (!activeUserId) return;

    const convId = `conv-${activeUserId}`;
    const socket = getCustomerSocket(undefined, activeUserId);
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", { conversationId: convId });
      socket.emit("join", { conversationId: activeUserId });
      if (guestId) socket.emit("join", { conversationId: `conv-${guestId}` });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new-message-received", (data: any) => {
      const targetConv = data.conversationId;
      const matchConv =
        targetConv === convId ||
        targetConv === activeUserId ||
        data.targetUserId === activeUserId ||
        data.guestId === activeUserId ||
        data.senderId === activeUserId ||
        (guestId && (targetConv === `conv-${guestId}` || data.guestId === guestId));

      if (matchConv) {
        // If message is sent by Admin/Agent
        if (data.isAdmin || (data.senderId !== activeUserId && data.senderId !== "user")) {
          const agentMsg: ChatMessage = {
            id: data._messageId || Date.now().toString(),
            sender: "agent",
            text: data.text,
            time: new Date(data.createdAt || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === agentMsg.id || (m.text === agentMsg.text && m.sender === "agent"))) {
              return prev;
            }
            return [...prev, agentMsg];
          });
          setIsTyping(false);
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      }
    });

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("join", { conversationId: convId });
      socket.emit("join", { conversationId: activeUserId });
      if (guestId) socket.emit("join", { conversationId: `conv-${guestId}` });
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new-message-received");
    };
  }, [activeUserId, guestId, isOpen]);

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
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Henry - Support Agent"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    isConnected ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Henry</h4>
                <p className="text-[11px] text-blue-100/90 font-medium">
                  Ferio Support Specialist ·{" "}
                  <span className={isConnected ? "text-emerald-300 font-semibold" : "text-amber-200"}>
                    {isConnected ? "Live Socket" : "Connecting..."}
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
          <div className="bg-amber-50 px-4 py-2 text-[11px] text-amber-800 border-b border-amber-200/80 flex items-center justify-between">
            <span>
              💬 Chatting as <strong className="font-semibold text-amber-900">{activeUserName}</strong>
            </span>
            <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100/80 px-2 py-0.5 rounded">
              {isLoggedIn ? "Account Sync" : "Guest Mode"}
            </span>
          </div>

          {/* Messages Area */}
          <div className="h-[340px] overflow-y-auto bg-slate-50/60 p-4 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "agent" && (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full overflow-hidden border border-blue-200">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                      alt="Henry"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "rounded-br-xs bg-ink text-white"
                      : "rounded-bl-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-blue-500/10"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`mt-1 block text-[9px] ${
                      msg.sender === "user" ? "text-slate-300 text-right" : "text-blue-100/80"
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
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                    alt="Henry"
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
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 shadow-md ${
                  !inputMessage.trim() ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
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
