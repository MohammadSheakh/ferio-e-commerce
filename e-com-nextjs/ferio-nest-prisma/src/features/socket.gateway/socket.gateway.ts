import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

import { SocketAuthService, scopedSocketRoom } from './services/socket-auth.service';
import { tryGetTenantContext } from '../../tenancy/tenant-context';
import { SocketRoomService } from './services/socket-room.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from '@app/redis';
import { FirebaseService } from '@app/notification';

const socketAllowedOrigins = [
  process.env.CUSTOMER_WEB_URL || 'http://localhost:3000',
  process.env.ADMIN_WEB_URL || 'http://localhost:3001',
  ...(process.env.SOCKET_ALLOWED_ORIGINS || '').split(','),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Socket.IO Gateway
 * 
 * 📚 REAL-TIME NOTIFICATION & CHAT GATEWAY
 */
@WebSocketGateway(Number(process.env.SOCKET_PORT) || 6734, {
  cors: {
    origin: socketAllowedOrigins,
    credentials: true,
  },
  path: '/socket.io',
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private activePageViews = new Map<
    string,
    {
      socketId: string;
      page: string;
      role: string;
      userId: string;
      name?: string;
      organizationId?: string;
      updatedAt: number;
    }
  >();

  constructor(
    private jwtService: JwtService,
    private socketAuthService: SocketAuthService,
    private socketRoomService: SocketRoomService,
    private firebaseService: FirebaseService,
    @Inject(REDIS_PUB_CLIENT) private redisPubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private redisSubClient: Redis,
  ) {}

  /**
   * Gateway Initialization
   */
  afterInit(server: Server) {
    this.logger.log('✅ Socket.IO Gateway initialized');
    
    // Attach Redis adapter for multi-worker support
    try {
      const adapter = createAdapter(this.redisPubClient, this.redisSubClient);
      server.adapter(adapter);
      this.logger.log('✅ Redis adapter attached to Socket.IO server');
    } catch (error) {
      this.logger.error(`❌ Failed to attach Redis adapter: ${error.message}`);
    }
  }

  /**
   * Handle Client Connection
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Authenticate user
      const user = await this.socketAuthService.authenticateSocket(client);

      if (!user) {
        this.logger.warn(`❌ Socket authentication failed: ${client.id}`);
        client.emit('io-error', {
          success: false,
          message: 'Authentication failed',
        });
        client.disconnect();
        return;
      }

      // Store user in socket data
      client.data.user = user;
      client.data.userId = user.userId;

      this.logger.log(
        `🔌 User connected: ${user.userId} (Socket: ${client.id})`,
      );

      // Handle user connection in Redis
      await this.socketAuthService.handleUserConnection(client, user);

      // Auto-join user's personal room & conversation room
      // MT-8 §11.3: every join is namespaced by the ticket's organization so
      // identical identifiers across tenants can never share a channel.
      const orgRoom = (room: string) => scopedSocketRoom(user, room);
      client.join(orgRoom(user.userId));
      client.join(orgRoom(`conv-${user.userId}`));
      this.logger.log(`✅ User ${user.userId} joined rooms: ${user.userId}, conv-${user.userId}`);

      // Auto-join role-based room
      if (user.role) {
        const lowerRole = String(user.role).toLowerCase();
        if (['admin', 'super_admin', 'super-admin'].includes(lowerRole)) {
          // MT-8 §11.3: tenant-bound admins join ONLY org-prefixed rooms so
          // one tenant's chats/notifications can never reach another's
          // console. Raw rooms exist solely for legacy (unbound) sockets.
          client.join(orgRoom('role::admin'));
          client.join(orgRoom('role::super-admin'));
          client.join(orgRoom('admin-room'));
          if (!user.organizationId) {
            client.join(`role::${user.role}`);
            client.join(`role::${lowerRole}`);
          }
          this.logger.log(`✅ Admin user ${user.userId} joined admin role rooms`);
        } else if (!user.organizationId) {
          client.join(`role::${user.role}`);
          client.join(`role::${lowerRole}`);
        }
      }

      // Auto-join family room (if applicable)
      await this.socketRoomService.autoJoinFamilyRoom(
        client,
        user.userId,
        user.organizationId,
      );

      // Notify related users about online status
      await this.notifyRelatedUsersOnlineStatus(user, true);

      // Track initial page view for visitors on storefront / rider portal pages
      const initialPage = (client.handshake.query?.page as string) || '/';
      const isDashboardPage = initialPage.toLowerCase().includes('/dashboard');

      if (!isDashboardPage) {
        this.activePageViews.set(client.id, {
          socketId: client.id,
          page: initialPage,
          role: user.role || 'guest',
          userId: user.userId || client.id,
          name: user.name || 'Guest Visitor',
          organizationId: user.organizationId,
          updatedAt: Date.now(),
        });
        this.broadcastLivePageStats(user.organizationId);
      }

      // Emit connection success
      client.emit('connected', {
        success: true,
        userId: user.userId,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`);
      client.emit('io-error', {
        success: false,
        message: 'Connection error',
      });
      client.disconnect();
    }
  }

  /**
   * Handle Client Disconnection
   */
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    const userId = user?.userId;

    if (this.activePageViews.has(client.id)) {
      this.activePageViews.delete(client.id);
      this.broadcastLivePageStats(client.data.user?.organizationId);
    }

    if (userId) {
      this.logger.log(`🔌 User disconnected: ${userId} (Socket: ${client.id})`);

      // Handle user disconnection in Redis
      const becameOffline = await this.socketAuthService.handleUserDisconnection(
        client,
        user,
      );

      // Notify related users about online status
      if (becameOffline) {
        await this.notifyRelatedUsersOnlineStatus(user, false);
      }
    }
  }

  /**
   * Handle Real-Time Page View Tracking from Web Clients
   */
  @SubscribeMessage('page-view')
  handlePageView(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page: string; title?: string },
  ) {
    if (!data || typeof data.page !== 'string') return;
    const page = data.page;
    client.data.currentPage = page;

    const user = client.data.user;
    const isDashboardPage = page.toLowerCase().includes('/dashboard');

    if (!isDashboardPage) {
      this.activePageViews.set(client.id, {
        socketId: client.id,
        page,
        role: user?.role || 'guest',
          userId: client.data.userId || client.id,
          name: user?.name || 'Guest Visitor',
          organizationId: user?.organizationId,
          updatedAt: Date.now(),
        });
      this.broadcastLivePageStats(user?.organizationId);
    } else if (this.activePageViews.delete(client.id)) {
      this.broadcastLivePageStats(user?.organizationId);
    }
  }

  public getLivePageStatsPayload(organizationId?: string) {
    const pageCounts: Record<string, number> = {
      '/': 0,
      '/cart': 0,
      '/checkout': 0,
      '/track': 0,
      '/products': 0,
      '/delivery/portal': 0,
    };

    let totalActive = 0;
    const activeVisitors: Array<{ page: string; role: string; name: string; userId: string }> = [];

    for (const [socketId, info] of this.activePageViews.entries()) {
      if (info.organizationId !== organizationId) continue;
      totalActive++;
      let rawPage = info.page.split('?')[0];
      if (!rawPage || rawPage === '') rawPage = '/';

      let cleanPage = rawPage;
      const lowerPage = rawPage.toLowerCase().trim();
      if (lowerPage.startsWith('/delivery') || lowerPage.includes('delivery')) {
        cleanPage = '/delivery/portal';
      } else if (lowerPage.startsWith('/products') || lowerPage.startsWith('/catalog') || lowerPage.startsWith('/shop')) {
        cleanPage = '/products';
      } else if (lowerPage.startsWith('/track')) {
        cleanPage = '/track';
      } else if (lowerPage.startsWith('/cart')) {
        cleanPage = '/cart';
      } else if (lowerPage.startsWith('/checkout')) {
        cleanPage = '/checkout';
      } else if (lowerPage.startsWith('/account')) {
        cleanPage = '/account';
      } else if (lowerPage === '/' || lowerPage === '') {
        cleanPage = '/';
      }

      pageCounts[cleanPage] = (pageCounts[cleanPage] || 0) + 1;
      activeVisitors.push({
        page: cleanPage,
        role: info.role,
        name: info.name || 'Guest Visitor',
        userId: info.userId,
      });
    }

    return {
      totalActive,
      pageCounts,
      activeVisitors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin Request for Immediate Live Page Stats Hydration
   */
  @SubscribeMessage('request-live-page-stats')
  handleRequestLivePageStats(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user || !this.socketAuthService.isAdmin(user.role)) {
      return { success: false, message: 'Administrator access required' };
    }
    const payload = this.getLivePageStatsPayload(user.organizationId);
    client.emit('live-page-visitors-stats', payload);
    return { success: true };
  }

  /**
   * Broadcast Live Active Page Visitor Metrics to Admin Room
   */
  public broadcastLivePageStats(organizationId?: string) {
    const payload = this.getLivePageStatsPayload(organizationId);
    if (organizationId) {
      this.server
        .to(scopedSocketRoom({ organizationId }, 'role::admin'))
        .to(scopedSocketRoom({ organizationId }, 'role::super-admin'))
        .to(scopedSocketRoom({ organizationId }, 'admin-room'))
        .emit('live-page-visitors-stats', payload);
      return;
    }
    this.server
      .to('role::admin')
      .to('role::super-admin')
      .to('admin-room')
      .emit('live-page-visitors-stats', payload);
  }

  /**
   * Notify Related Users about Online Status
   */
  private async notifyRelatedUsersOnlineStatus(
    user: { userId: string; role: string; name: string; organizationId?: string },
    isOnline: boolean,
  ) {
    try {
      const relatedUsers = await this.socketAuthService.getRelatedOnlineUsers(user);

      for (const relatedUserId of relatedUsers) {
        // Don't notify self
        if (relatedUserId === user.userId) continue;

        this.server
          .to(scopedSocketRoom(user, relatedUserId))
          .emit(`related-user-online-status::${relatedUserId}`, {
            userId: user.userId,
            isOnline,
          });
      }
    } catch (error) {
      this.logger.error(`❌ Failed to notify related users: ${error.message}`);
    }
  }

  /**
   * Join Conversation Room
   */
  @SubscribeMessage('join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = data;

      if (!conversationId) {
        return { success: false, message: 'conversationId is required' };
      }

      if (!(await this.socketAuthService.canAccessConversation(client.data.user, conversationId))) {
        return { success: false, message: 'Conversation access denied' };
      }

      // Join Socket.IO room
      client.join(scopedSocketRoom(client.data?.user, conversationId));

      // Update Redis state
      await this.socketRoomService.joinRoom(
        userId,
        conversationId,
        client.data.user?.organizationId,
      );

      // Get room users
      const roomUsers = await this.socketRoomService.getRoomUsers(
        conversationId,
        client.data.user?.organizationId,
      );

      this.logger.log(
        `👥 Room ${conversationId} has ${roomUsers.length} users: ${roomUsers.join(', ')}`,
      );

      // Notify others in the chat
      client.to(scopedSocketRoom(client.data?.user, conversationId)).emit('user-joined-chat', {
        userId,
        userName: client.data.user?.name,
        conversationId,
        isOnline: true,
      });

      return {
        success: true,
        message: 'Joined conversation successfully',
        roomUsers,
      };
    } catch (error) {
      this.logger.error(`❌ Join room error: ${error.message}`);
      return { success: false, message: 'Failed to join room' };
    }
  }

  /**
   * Leave Conversation Room
   */
  @SubscribeMessage('leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = data;

      if (!conversationId) {
        return { success: false, message: 'conversationId is required' };
      }

      // Leave Socket.IO room
      client.leave(scopedSocketRoom(client.data?.user, conversationId));

      // Update Redis state
      await this.socketRoomService.leaveRoom(
        userId,
        conversationId,
        client.data.user?.organizationId,
      );

      // Notify others
      client.to(scopedSocketRoom(client.data?.user, conversationId)).emit('user-left-chat', {
        userId,
        userName: client.data.user?.name,
        conversationId,
      });

      return { success: true, message: 'Left conversation successfully' };
    } catch (error) {
      this.logger.error(`❌ Leave room error: ${error.message}`);
      return { success: false, message: 'Failed to leave room' };
    }
  }

  /**
   * Handle Real-Time Chat Message Relay
   */
  @SubscribeMessage('new-message-received')
  async handleNewMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const { conversationId } = data || {};
      const user = client.data?.user;
      const userId = user?.userId;
      const targetConvId = conversationId || `conv-${userId}`;
      const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 4000) : '';

      if (!userId || !text || !(await this.socketAuthService.canAccessConversation(user, targetConvId))) {
        return { success: false, message: 'Conversation access denied' };
      }
      const db = await this.socketAuthService.databaseForSocket(user);

      const isAdmin = this.socketAuthService.isAdmin(user.role);
      const isGuest = user.role === 'guest';
      const rawTargetId = targetConvId.replace(/^conv-/, '');
      const targetGuestId = isGuest
        ? userId
        : isAdmin && rawTargetId.startsWith('gst_')
          ? rawTargetId
          : undefined;

      const payload = {
        _messageId: data?._messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        conversationId: targetConvId,
        text: text || '',
        senderId: userId,
        senderName: user.name || (isGuest ? 'Guest Visitor' : 'Customer'),
        createdAt: data?.createdAt || new Date().toISOString(),
        isGuest,
        guestId: targetGuestId,
        isAdmin,
      };

      this.logger.log(`💬 Socket Message Relay: [${payload.senderName}] in [${targetConvId}]: "${payload.text}"`);

      // 1. Broadcast to target conversation room & prefixed room
      const rawConvId = targetConvId.replace(/^conv-/, '');
      const prefConvId = targetConvId.startsWith('conv-') ? targetConvId : `conv-${targetConvId}`;

      // 1. Target Room Emission — tenant-scoped by the sender's binding
      const senderUser: { organizationId?: string } | null =
        (client?.data?.user as { organizationId?: string } | null) ?? null;
      this.server
        .to(scopedSocketRoom(senderUser, targetConvId))
        .emit('new-message-received', payload);
      // Lookup target user and customer links to emit to all related rooms (Customer ID & User ID & Email)
      const targetIdToSearch = rawConvId;
      const [linkedUser, linkedCustomer] = await Promise.all([
        db.user.findFirst({
          where: {
            isDeleted: false,
            OR: [
              { id: targetIdToSearch },
              { customerId: targetIdToSearch },
              { id: rawConvId },
              { customerId: rawConvId },
            ],
          },
          select: { id: true, customerId: true, email: true },
        }),
        db.customer.findFirst({
          where: {
            OR: [
              { id: targetIdToSearch },
              { id: rawConvId },
            ],
          },
          include: { user: true },
        }),
      ]);

      const senderOrg = (
        client?.data?.user as { organizationId?: string } | undefined
      )?.organizationId;
      const roomsToEmit = new Set<string>([
        scopedSocketRoom({ organizationId: senderOrg }, rawConvId),
        scopedSocketRoom({ organizationId: senderOrg }, prefConvId),
      ]);
      const addRoom = (room: string) =>
        roomsToEmit.add(scopedSocketRoom({ organizationId: senderOrg }, room));

      if (linkedUser) {
        if (linkedUser.id) {
          addRoom(linkedUser.id);
          addRoom(`conv-${linkedUser.id}`);
        }
        if (linkedUser.customerId) {
          addRoom(linkedUser.customerId);
          addRoom(`conv-${linkedUser.customerId}`);
        }
      }

      if (linkedCustomer) {
        if (linkedCustomer.id) {
          addRoom(linkedCustomer.id);
          addRoom(`conv-${linkedCustomer.id}`);
        }
        if (linkedCustomer.user?.id) {
          addRoom(linkedCustomer.user.id);
          addRoom(`conv-${linkedCustomer.user.id}`);
        }
      }

      // Cross-lookup by email if available
      const searchEmail = linkedUser?.email || linkedCustomer?.email;
      if (searchEmail) {
        const [userByEmail, custByEmail] = await Promise.all([
          db.user.findFirst({ where: { email: searchEmail } }),
          db.customer.findFirst({
            where: { email: searchEmail },
            include: { user: true },
          }),
        ]);
        if (userByEmail) {
          addRoom(userByEmail.id);
          addRoom(`conv-${userByEmail.id}`);
          if (userByEmail.customerId) {
            addRoom(userByEmail.customerId);
            addRoom(`conv-${userByEmail.customerId}`);
          }
        }
        if (custByEmail) {
          addRoom(custByEmail.id);
          addRoom(`conv-${custByEmail.id}`);
          if (custByEmail.user?.id) {
            addRoom(custByEmail.user.id);
            addRoom(`conv-${custByEmail.user.id}`);
          }
        }
      }

      roomsToEmit.forEach((room) => {
        this.server.to(room).emit('new-message-received', payload);
      });

      // 2. Broadcast to all admin role rooms — scoped by the sender's tenant
      // binding; a customer chat can only reach admins of the same tenant.
      if (senderOrg) {
        this.server
          .to(scopedSocketRoom({ organizationId: senderOrg }, 'role::admin'))
          .to(scopedSocketRoom({ organizationId: senderOrg }, 'role::super-admin'))
          .to(scopedSocketRoom({ organizationId: senderOrg }, 'admin-room'))
          .emit('new-message-received', payload);
      } else {
        this.server.to('role::admin').to('role::super-admin').to('admin-room').emit('new-message-received', payload);
      }

      // 3. Direct target emission
      if (payload.senderId) {
        this.server
          .to(scopedSocketRoom({ organizationId: senderOrg }, payload.senderId))
          .emit('new-message-received', payload);
        this.server
          .to(scopedSocketRoom({ organizationId: senderOrg }, `conv-${payload.senderId}`))
          .emit('new-message-received', payload);
      }
      if (payload.guestId) {
        this.server
          .to(scopedSocketRoom({ organizationId: senderOrg }, payload.guestId))
          .emit('new-message-received', payload);
        this.server
          .to(scopedSocketRoom({ organizationId: senderOrg }, `conv-${payload.guestId}`))
          .emit('new-message-received', payload);
      }

      // 4. Persist Message & Conversation in Prisma Database
      try {
        const canonicalConvId = linkedCustomer?.id
          ? `conv-${linkedCustomer.id}`
          : (linkedUser?.customerId ? `conv-${linkedUser.customerId}` : prefConvId);

        let validSenderUser: any = null;

        if (payload.isGuest) {
          validSenderUser = await db.user.upsert({
            where: { id: 'system_guest_chat_user' },
            update: {},
            create: {
              id: 'system_guest_chat_user',
              name: 'Guest Visitor',
              email: 'guest@ferio.local',
              role: 'user',
              isDeleted: false,
            },
          });
        } else {
          validSenderUser = await db.user.findFirst({
            where: { id: payload.senderId, isDeleted: false },
          });
        }

        if (validSenderUser) {
          let conversation = await db.conversation.findFirst({
            where: {
              isDeleted: false,
              id: { in: [targetConvId, rawConvId, prefConvId] },
            },
          });

          if (!conversation) {
            conversation = await db.conversation.create({
              data: {
                id: canonicalConvId,
                creatorId: validSenderUser.id,
                type: 'direct',
                lastMessageText: payload.text,
                lastMessageCreatedAt: new Date(payload.createdAt),
              },
            });
          } else {
            await db.conversation.update({
              where: { id: conversation.id },
              data: {
                lastMessageText: payload.text,
                lastMessageCreatedAt: new Date(payload.createdAt),
              },
            });
          }

          // Check if message was already created to prevent duplicates
          const existingMsg = await db.message.findUnique({
            where: { id: payload._messageId },
          });

          if (!existingMsg) {
            await db.message.create({
              data: {
                id: payload._messageId,
                text: payload.text,
                senderId: validSenderUser.id,
                conversationId: conversation.id,
                createdAt: new Date(payload.createdAt),
              },
            });
            this.logger.log(`💾 Persisted message [${payload._messageId}] to DB in conversation [${conversation.id}]`);
          }
        }
      } catch (dbErr: any) {
        this.logger.warn(`⚠️ Could not persist chat message to DB: ${dbErr.message}`);
      }

      return { success: true, data: payload };
    } catch (error: any) {
      this.logger.error(`❌ handleNewMessage error: ${error.message}`);
      return { success: false, message: 'Failed to process message' };
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessageAlias(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    return this.handleNewMessage(client, data);
  }

  /**
   * Join Task Room
   */
  @SubscribeMessage('join-task')
  async handleJoinTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { taskId } = data;

      if (!taskId) {
        return { success: false, message: 'taskId is required' };
      }

      // MT-8 §11.3: identical task identifiers across tenants cannot share a
      // channel or presence list.
      const taskRoom = scopedSocketRoom(client.data?.user, taskId);

      // Join Socket.IO room
      client.join(taskRoom);

      // Update Redis state
      await this.socketRoomService.joinTaskRoom(
        userId,
        taskRoom,
        client.data.user?.organizationId,
      );

      // Get task room users
      const roomUsers = await this.socketRoomService.getTaskRoomUsers(
        taskRoom,
        client.data.user?.organizationId,
      );

      this.logger.log(
        `📋 Task room ${taskRoom} has ${roomUsers.length} users`,
      );

      // Notify others in the task
      client.to(taskRoom).emit('user-joined-task', {
        userId,
        userName: client.data.user?.name,
        taskId,
        isOnline: true,
      });

      return { success: true, message: 'Joined task room successfully' };
    } catch (error) {
      this.logger.error(`❌ Join task room error: ${error.message}`);
      return { success: false, message: 'Failed to join task room' };
    }
  }

  /**
   * Leave Task Room
   */
  @SubscribeMessage('leave-task')
  async handleLeaveTaskRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { taskId } = data;

      if (!taskId) {
        return { success: false, message: 'taskId is required' };
      }

      const taskRoom = scopedSocketRoom(client.data?.user, taskId);

      // Leave Socket.IO room
      client.leave(taskRoom);

      // Update Redis state
      await this.socketRoomService.leaveTaskRoom(
        userId,
        taskRoom,
        client.data.user?.organizationId,
      );

      // Notify others
      client.to(taskRoom).emit('user-left-task', {
        userId,
        userName: client.data.user?.name,
        taskId,
      });

      return { success: true, message: 'Left task room successfully' };
    } catch (error) {
      this.logger.error(`❌ Leave task room error: ${error.message}`);
      return { success: false, message: 'Failed to leave task room' };
    }
  }

  /**
   * Get Related Online Users
   */
  @SubscribeMessage('only-related-online-users')
  async handleGetRelatedOnlineUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data: { userId?: string },
  ) {
    try {
      const user = client.data.user;
      if (!user) return { success: false, message: 'Authentication required' };
      const relatedOnlineUsers = await this.socketAuthService.getRelatedOnlineUsers(
        user,
      );

      this.logger.log(
        `📊 Related online users for ${user.userId}: ${relatedOnlineUsers.length}`,
      );

      return {
        success: true,
        data: relatedOnlineUsers,
      };
    } catch (error) {
      this.logger.error(`❌ Get related online users error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch related online users',
      };
    }
  }

  /**
   * Get Family Activity Feed
   */
  @SubscribeMessage('get-family-activity-feed')
  async handleGetFamilyActivityFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { businessUserId: string; limit?: number },
  ) {
    try {
      const limit = data.limit || 10;
      const activities = await this.socketRoomService.getActivityFeed(
        data.businessUserId,
        limit,
        client.data.user?.organizationId,
      );

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      this.logger.error(`❌ Get family activity feed error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch activity feed',
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // NOTIFICATION EMISSION METHODS
  // Called from NotificationService to emit real-time notifications
  // ────────────────────────────────────────────────────────────────────────

  /**
   * MT-8 §11.3: server-side emissions resolve the ambient tenant context.
   * Inside a resolved request/worker ONLY the org-prefixed room is targeted
   * — tenant events can never reach legacy or foreign-tenant sockets.
   * Outside a resolved context the historical raw room is preserved.
   */
  private ambientRooms(room: string): string[] {
    const orgId = tryGetTenantContext()?.organizationId;
    return [scopedSocketRoom({ organizationId: orgId }, room)];
  }

  /**
   * Emit Notification to User
   *
   * @param userId - User ID
   * @param notification - Notification data
   */
  async emitNotificationToUser(userId: string, notification: any): Promise<boolean> {
    try {
      const eventName = `notification::${userId}`;

      for (const room of this.ambientRooms(userId)) {
        this.server.to(room).emit(eventName, notification);
      }

      this.logger.log(`🔔 Notification sent to user ${userId}`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to emit notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Emit Unread Count Update to User
   *
   * @param userId - User ID
   * @param count - Unread count
   */
  async emitUnreadCountUpdate(userId: string, count: number): Promise<void> {
    try {
      const eventName = `notification:unread-count::${userId}`;

      for (const room of this.ambientRooms(userId)) {
        this.server.to(room).emit(eventName, { count, hasUnread: count > 0 });
      }

      this.logger.debug(`📊 Unread count update sent to user ${userId}: ${count}`);
    } catch (error) {
      this.logger.error(`❌ Failed to emit unread count: ${error.message}`);
    }
  }

  /**
   * Broadcast to Role
   *
   * @param role - Role name
   * @param event - Event name
   * @param data - Data to emit
   */
  async broadcastToRole(role: string, event: string, data: any): Promise<void> {
    try {
      const roomName = `role::${role}`;

      for (const room of this.ambientRooms(roomName)) {
        this.server.to(room).emit(event, data);
      }

      this.logger.log(`📢 Broadcast to role ${role}: ${event}`);
    } catch (error) {
      this.logger.error(`❌ Failed to broadcast to role: ${error.message}`);
    }
  }

  /**
   * Check if User is Online
   *
   * @param userId - User ID
   */
  async isUserOnline(userId: string): Promise<boolean> {
    for (const room of this.ambientRooms(userId)) {
      const sockets = await this.server.in(room).fetchSockets();
      if (sockets.length > 0) return true;
    }
    return false;
  }

  /**
   * Emit to User
   *
   * @param userId - User ID
   * @param event - Event name
   * @param data - Data to emit
   */
  async emitToUser(userId: string, event: string, data: any): Promise<boolean> {
    try {
      const isOnline = await this.isUserOnline(userId);
      if (isOnline) {
        for (const room of this.ambientRooms(userId)) {
          this.server.to(room).emit(event, data);
        }
        this.logger.log(`🔔 Emitted to online user ${userId}`);
        return true;
      }

      // Offline: push notification
      const user: any = await this.socketAuthService.getUserProfile(userId);
      if (user?.fcmToken) {
        await this.firebaseService.sendPushNotification(
          user.fcmToken,
          data.title || 'New Notification',
          data.message || 'You have a new message',
          data,
        );
        this.logger.log(`📱 Push notification sent to offline user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ Failed to emit to user: ${error.message}`);
      return false;
    }
  }

  /**
   * Emit to Room
   *
   * @param roomId - Room ID
   * @param event - Event name
   * @param data - Data to emit
   */
  async emitToRoom(roomId: string, event: string, data: any): Promise<boolean> {
    try {
      for (const room of this.ambientRooms(roomId)) {
        this.server.to(room).emit(event, data);
      }
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to emit to room: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if member is in room
   *
   * @param userId - User ID
   * @param roomId - Room ID
   */
  async isMemberInRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      return await this.socketRoomService.isUserInRoom(userId, roomId);
    } catch (error) {
      this.logger.error(`❌ Failed to check if member is in room: ${error.message}`);
      return false;
    }
  }
}
