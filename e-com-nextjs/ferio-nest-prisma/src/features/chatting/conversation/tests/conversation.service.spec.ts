import { ForbiddenException } from '@nestjs/common';
import {
  buildDirectConversationLockKey,
  ConversationService,
} from '../conversation.service';
import { ParticipantRole } from '../conversation.constant';
import { runWithTenantContext } from '../../../../tenancy/context/tenant-context';

describe('ConversationService participant authorization', () => {
  function createService(actor: { role: string } | null) {
    const prisma = {
      conversationParticipents: {
        findFirst: jest.fn().mockResolvedValue(actor),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const socketGateway = { emitToRoom: jest.fn() };
    const tenantDb = { getOrLegacy: jest.fn().mockResolvedValue(prisma) };
    const service = new ConversationService(
      prisma as never,
      socketGateway as never,
      {} as never,
      {} as never,
      tenantDb as never,
    );
    return { service, prisma, socketGateway };
  }

  it('rejects participant additions by a non-administrator', async () => {
    const { service, prisma } = createService(null);

    await expect(
      service.addParticipantsToConversation(
        'conversation-1',
        ['user-2'],
        'user-1',
        true,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conversationParticipents.create).not.toHaveBeenCalled();
  });

  it('rejects removal of another participant by a member', async () => {
    const { service, prisma } = createService({
      role: ParticipantRole.MEMBER,
    });

    await expect(
      service.removeParticipant('conversation-1', 'user-2', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conversationParticipents.updateMany).not.toHaveBeenCalled();
  });

  it('allows a participant to leave their own conversation', async () => {
    const { service, prisma, socketGateway } = createService({
      role: ParticipantRole.MEMBER,
    });

    await expect(
      service.removeParticipant('conversation-1', 'user-1', 'user-1'),
    ).resolves.toBeUndefined();
    expect(prisma.conversationParticipents.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'conversation-1', userId: 'user-1' },
      data: { isDeleted: true },
    });
    expect(socketGateway.emitToRoom).toHaveBeenCalled();
  });

  it('namespaces direct-conversation locks by the trusted organization', () => {
    const context = (organizationId: string) => ({
      correlationId: `correlation-${organizationId}`,
      organizationId,
      tenantDatabaseId: `database-${organizationId}`,
      database: {
        id: `database-${organizationId}`,
        host: 'localhost',
        port: 5432,
        databaseName: `tenant_${organizationId}`,
        username: 'tenant',
        credentialCipher: 'encrypted',
      },
      domainId: `domain-${organizationId}`,
      hostname: `${organizationId}.ferio.test`,
      subscriptionStatus: 'ACTIVE' as const,
    });

    const lockKeyA = runWithTenantContext(context('org-a'), () =>
      buildDirectConversationLockKey(['user-2', 'user-1']),
    );
    const lockKeyB = runWithTenantContext(context('org-b'), () =>
      buildDirectConversationLockKey(['user-2', 'user-1']),
    );

    expect(lockKeyA).toBe('org-a:user-1:user-2');
    expect(lockKeyB).toBe('org-b:user-1:user-2');
    expect(lockKeyA).not.toBe(lockKeyB);
  });
});
