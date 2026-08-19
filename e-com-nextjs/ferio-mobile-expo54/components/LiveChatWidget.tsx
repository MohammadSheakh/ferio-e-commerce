import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/state/auth';
import { getMobileSocket } from '@/lib/socket';
import { apiGet } from '@/lib/api';

interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  time: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'agent',
    text: 'Hi there! 👋 Welcome to Ferio Support.',
    time: 'Just now',
  },
  {
    id: '2',
    sender: 'agent',
    text: 'How can I help you today?',
    time: 'Just now',
  },
];

export default function LiveChatWidget() {
  const { user, accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [guestId, setGuestId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<ReturnType<typeof getMobileSocket> | null>(null);

  // 1. Safe Identity Resolution & Local History Load
  useEffect(() => {
    let isSubscribed = true;
    async function initIdentity() {
      try {
        let savedGuestId = await AsyncStorage.getItem('ferio_chat_guest_id');
        if (!savedGuestId) {
          savedGuestId = `gst_${Math.floor(1000 + Math.random() * 9000)}`;
          await AsyncStorage.setItem('ferio_chat_guest_id', savedGuestId);
        }
        if (isSubscribed) setGuestId(savedGuestId);

        const currentActiveId = user?.id || savedGuestId;
        const savedHistory = await AsyncStorage.getItem(`ferio_chat_history_${currentActiveId}`);
        if (savedHistory && isSubscribed) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // Fallback silently
      }
    }
    void initIdentity();
    return () => {
      isSubscribed = false;
    };
  }, [user]);

  const activeUserId = user?.id || guestId;
  const activeUserName = user?.name
    ? user.name
    : user?.email
    ? user.email
    : guestId
    ? `Guest Visitor #${guestId.replace('gst_', '')}`
    : 'Guest Visitor';

  const userRef = useRef(user);
  const guestIdRef = useRef(guestId);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    guestIdRef.current = guestId;
  }, [guestId]);

  // 2. Real-Time Socket Connection & Event Listeners
  useEffect(() => {
    if (!activeUserId) return;

    let socket: ReturnType<typeof getMobileSocket> | null = null;
    try {
      const convId = `conv-${activeUserId}`;
      socket = getMobileSocket(accessToken || undefined, activeUserId);
      socketRef.current = socket;

      const joinAllRooms = () => {
        if (!socket) return;
        socket.emit('join', { conversationId: convId });
        socket.emit('join', { conversationId: activeUserId });
        const currentU = userRef.current;
        const currentG = guestIdRef.current;

        if (currentU?.id) {
          socket.emit('join', { conversationId: currentU.id });
          socket.emit('join', { conversationId: `conv-${currentU.id}` });
        }
        if (currentG) {
          socket.emit('join', { conversationId: currentG });
          socket.emit('join', { conversationId: `conv-${currentG}` });
        }
      };

      const handleConnect = () => {
        setIsConnected(true);
        joinAllRooms();
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      const handleNewMessage = (data: any) => {
        const targetConv = data.conversationId;
        const currentU = userRef.current;
        const currentG = guestIdRef.current;
        const usrId = currentU?.id;

        const matchConv =
          targetConv === convId ||
          targetConv === `conv-${activeUserId}` ||
          targetConv === activeUserId ||
          (usrId && (targetConv === usrId || targetConv === `conv-${usrId}`)) ||
          data.targetUserId === activeUserId ||
          (usrId && data.targetUserId === usrId) ||
          data.senderId === activeUserId ||
          (currentG && (targetConv === `conv-${currentG}` || targetConv === currentG || data.guestId === currentG)) ||
          Boolean(data.isAdmin);

        if (matchConv) {
          const isAgent = Boolean(
            data.isAdmin ||
            data.senderName?.toLowerCase().includes('support') ||
            data.senderName?.toLowerCase().includes('mohammad sheakh') ||
            data.senderId === 'admin-current'
          );

          const newMsg: ChatMessage = {
            id: data._messageId || data.id || Date.now().toString(),
            sender: isAgent ? 'agent' : 'user',
            text: data.text || data.message || '',
            time: new Date(data.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
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
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new-message-received', handleNewMessage);

      if (socket.connected) {
        setIsConnected(true);
        joinAllRooms();
      }

      return () => {
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('new-message-received', handleNewMessage);
        }
      };
    } catch {
      // Non-blocking socket error handling
    }
  }, [activeUserId, accessToken, isOpen]);

  // 3. Persist Messages to AsyncStorage
  useEffect(() => {
    if (activeUserId && messages.length > 0) {
      AsyncStorage.setItem(`ferio_chat_history_${activeUserId}`, JSON.stringify(messages)).catch(() => {});
    }
  }, [activeUserId, messages]);

  // 4. Fetch Message History from NestJS Backend API (/conversations/:conversationId/messages)
  useEffect(() => {
    if (!activeUserId) return;

    const targetConvId = `conv-${activeUserId}`;
    async function loadDbHistory() {
      try {
        const res = await apiGet<{ results?: any[] } | any[]>(
          `/conversations/${encodeURIComponent(targetConvId)}/messages?limit=100`
        );

        const rawResults = Array.isArray(res)
          ? res
          : res && typeof res === 'object' && Array.isArray((res as any).results)
          ? (res as any).results
          : [];

        if (rawResults.length > 0) {
          const formatted: ChatMessage[] = rawResults.map((m: any) => ({
            id: m.id || m._messageId || Date.now().toString(),
            sender:
              m.sender?.role === 'admin' ||
              m.senderRole === 'admin' ||
              m.isAdmin ||
              m.senderId === 'admin-current'
                ? 'agent'
                : 'user',
            text: m.text,
            time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));

          setMessages((prev) => {
            const merged = [...prev];
            for (const item of formatted) {
              if (
                !merged.some(
                  (m) =>
                    m.id === item.id ||
                    (m.text === item.text && m.sender === item.sender)
                )
              ) {
                merged.push(item);
              }
            }
            return merged;
          });
        }
      } catch {
        // Fallback silently
      }
    }
    void loadDbHistory();
  }, [activeUserId]);

  // 5. Send Message to Admin via Socket.IO
  const handleSend = () => {
    if (!inputText.trim()) return;

    const msgText = inputText.trim();
    setInputText('');

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);

    const convId = `conv-${activeUserId}`;
    const payload = {
      recipientId: 'admin-current',
      message: msgText,
      text: msgText,
      senderName: activeUserName,
      senderId: activeUserId,
      guestId: user ? undefined : guestId,
      conversationId: convId,
      userRole: user ? 'customer' : 'guest',
      isGuest: !user,
    };

    if (socketRef.current) {
      try {
        socketRef.current.emit('private-message', payload);
        socketRef.current.emit('new-message-received', payload);
      } catch {
        // Fallback
      }
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleOpen}
          activeOpacity={0.8}
        >
          <View style={styles.floatingButtonContent}>
            <Text style={styles.floatingIcon}>💬</Text>
            <View style={styles.onlineBadgeDot} />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Live Chat Modal Sheet */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.agentInfo}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>H</Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isConnected ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                </View>

                <View>
                  <Text style={styles.agentName}>Mohammad Sheakh — Ferio Support</Text>
                  <Text style={styles.agentStatus}>
                    {isConnected ? 'Online · Replies in <2 mins' : 'Connecting...'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Message Thread List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isUser = item.sender === 'user';
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isUser ? styles.messageRowUser : styles.messageRowAgent,
                    ]}
                  >
                    {!isUser && (
                      <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarText}>H</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleAgent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isUser ? styles.messageTextUser : styles.messageTextAgent,
                        ]}
                      >
                        {item.text}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isUser ? styles.timeTextUser : styles.timeTextAgent,
                        ]}
                      >
                        {item.time}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            {/* Typing Indicator */}
            {isTyping && (
              <View style={styles.typingContainer}>
                <ActivityIndicator size="small" color="#18181B" />
                <Text style={styles.typingText}>Support Agent is typing...</Text>
              </View>
            )}

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Write a message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendIcon}>➔</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    zIndex: 999,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  floatingButtonContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingIcon: {
    fontSize: 24,
  },
  onlineBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#18181B',
  },
  unreadBadge: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18181B',
  },
  agentStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAgent: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#18181B',
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAgent: {
    color: '#18181B',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextAgent: {
    color: '#9CA3AF',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: '#F9FAFB',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#18181B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
