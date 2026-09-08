import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { StructuredLogger, type UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import {
  resolveTenantDatabase,
  TenantDbService,
} from '../../../tenancy/services/tenant-db.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  TransactionalMessageQueryDto,
  UpdateMessageTemplateDto,
  UpdateMessagingProviderConfigDto,
  UpdateMessagingPolicyDto,
} from '../dto/transactional-message.dto';
import { MessageAdapterRegistry } from '../adapters/message-adapter.registry';
import {
  decryptMessagingCredentials,
  encryptMessagingCredentials,
  type MessagingCredentials,
} from '../utils/messaging-credentials.util';
import {
  buildMessageDeduplicationKey,
  commerceTemplateDefinitions,
  definitionForTemplateKey,
  maskMessageRecipient,
  renderMessageTemplate,
  templateForCommerceEvent,
  validateMessageTemplate,
} from '../utils/transactional-message.util';

export type EnqueueCommerceMessageInput = {
  eventType: string;
  recipient: string;
  referenceType: string;
  referenceId: string;
  occurrenceKey?: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class TransactionalMessagingService {
  private readonly logger = new StructuredLogger(
    TransactionalMessagingService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly adapters: MessageAdapterRegistry,
    @Optional() private readonly config?: ConfigService,
    private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one (legacy mode, platform workers pre-MT-8) it
   * explicitly falls back to the legacy single-tenant DB. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return resolveTenantDatabase(this.tenantDb, this.prisma);
  }
  async enqueueAfterCommit(input: EnqueueCommerceMessageInput): Promise<void> {
    const db = await this.db();
    if (!input.recipient) return;
    const templateKey = templateForCommerceEvent(input.eventType);
    if (!templateKey) return;
    try {
      const definition = definitionForTemplateKey(templateKey);
      if (!definition) return;
      const template = await db.commerceMessageTemplate.upsert({
        where: { key: templateKey },
        update: {},
        create: {
          key: definition.key,
          eventType: definition.eventType,
          subjectTemplate: definition.subjectTemplate,
          bodyTemplate: definition.bodyTemplate,
        },
      });
      if (!template.enabled) return;
      const payload = this.templatePayload(input.payload);
      await db.commerceMessage.upsert({
        where: {
          deduplicationKey: buildMessageDeduplicationKey(
            input.eventType,
            input.referenceType,
            input.referenceId,
            input.occurrenceKey,
          ),
        },
        update: {},
        create: {
          deduplicationKey: buildMessageDeduplicationKey(
            input.eventType,
            input.referenceType,
            input.referenceId,
            input.occurrenceKey,
          ),
          eventType: input.eventType,
          templateKey,
          templateVersion: template.version,
          // Empty plan = "not yet routed"; the dispatcher computes it from
          // the active routing policy before first delivery attempt.
          channelPlan: [],
          renderedSubject: template.subjectTemplate
            ? renderMessageTemplate(template.subjectTemplate, payload)
            : null,
          renderedBody: renderMessageTemplate(template.bodyTemplate, payload),
          recipient: input.recipient,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          payload: input.payload,
        },
      });
    } catch (error) {
      this.logger.error('transactional_message_enqueue_failed', error, {
        eventType: input.eventType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      });
    }
  }

  async getTemplates() {
    const db = await this.db();
    const templates = await db.$transaction(
      commerceTemplateDefinitions.map((definition) =>
        db.commerceMessageTemplate.upsert({
          where: { key: definition.key },
          update: {},
          create: {
            key: definition.key,
            eventType: definition.eventType,
            subjectTemplate: definition.subjectTemplate,
            bodyTemplate: definition.bodyTemplate,
          },
        }),
      ),
    );
    return templates.map((template) => ({
      ...template,
      allowedVariables:
        definitionForTemplateKey(template.key)?.allowedVariables ?? [],
    }));
  }

  async updateTemplate(
    key: string,
    dto: UpdateMessageTemplateDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const normalizedKey = key.normalize('NFKC').trim();
    const definition = definitionForTemplateKey(normalizedKey);
    if (!definition) throw new NotFoundException('Message template not found');
    if (
      dto.enabled === undefined &&
      dto.subjectTemplate === undefined &&
      dto.bodyTemplate === undefined
    ) {
      throw new BadRequestException('Provide at least one template change');
    }
    const current = await db.commerceMessageTemplate.upsert({
      where: { key: definition.key },
      update: {},
      create: {
        key: definition.key,
        eventType: definition.eventType,
        subjectTemplate: definition.subjectTemplate,
        bodyTemplate: definition.bodyTemplate,
      },
    });
    const subjectTemplate =
      dto.subjectTemplate === undefined
        ? current.subjectTemplate
        : dto.subjectTemplate.normalize('NFKC').trim() || null;
    const bodyTemplate =
      dto.bodyTemplate === undefined
        ? current.bodyTemplate
        : dto.bodyTemplate.normalize('NFKC').trim();
    if (!bodyTemplate) {
      throw new BadRequestException('Message body cannot be empty');
    }
    for (const template of [subjectTemplate, bodyTemplate]) {
      if (!template) continue;
      const validationError = validateMessageTemplate(
        template,
        definition.allowedVariables,
      );
      if (validationError) throw new BadRequestException(validationError);
    }

    return db.$transaction(async (transaction) => {
      const updated = await transaction.commerceMessageTemplate.update({
        where: { key: definition.key },
        data: {
          enabled: dto.enabled ?? current.enabled,
          subjectTemplate,
          bodyTemplate,
          version: { increment: 1 },
          updatedById: actor.userId,
        },
      });
      await this.audit.record(
        {
          action: 'TRANSACTIONAL_MESSAGE_TEMPLATE_UPDATED',
          entityType: 'CommerceMessageTemplate',
          entityId: updated.key,
          actor,
          previousValue: current,
          newValue: updated,
        },
        transaction,
      );
      return { ...updated, allowedVariables: definition.allowedVariables };
    });
  }

  async getMessages(query: TransactionalMessageQueryDto) {
    const db = await this.db();
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.CommerceMessageWhereInput = {
      status: query.status,
      eventType: query.eventType
        ? {
            equals: query.eventType.normalize('NFKC').trim(),
            mode: 'insensitive',
          }
        : undefined,
      OR: search
        ? [
            { referenceId: { contains: search, mode: 'insensitive' } },
            { eventType: { contains: search, mode: 'insensitive' } },
            { templateKey: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [messages, total, grouped] = await db.$transaction([
      db.commerceMessage.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
      }),
      db.commerceMessage.count({ where }),
      db.commerceMessage.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { status: true },
      }),
    ]);
    const policy = await this.getPolicy();
    return {
      items: messages.map((message) => ({
        ...message,
        recipient: maskMessageRecipient(message.recipient),
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      counts: Object.fromEntries(
        grouped.map((entry) => [
          entry.status,
          entry._count && typeof entry._count === 'object'
            ? (entry._count.status ?? 0)
            : 0,
        ]),
      ),
      dispatchConfigured: policy.enabled && policy.activationAllowed,
      dispatchNote:
        'Dispatch remains disabled until policy and an approved provider adapter are active',
      policy,
    };
  }

  async getPolicy() {
    const db = await this.db();
    const policy = await db.commerceMessagingPolicy.upsert({
      where: { id: 'transactional-default' },
      update: {},
      create: { id: 'transactional-default' },
    });
    const channels = this.adapters.readiness(await this.providerConfigs(db));
    return {
      ...policy,
      channels,
      activationAllowed: channels.some((channel) => channel.configured),
    };
  }

  async updatePolicy(dto: UpdateMessagingPolicyDto, actor: UserPayload) {
    const db = await this.db();
    const current = await this.getPolicy();
    const priority = dto.channelPriority ?? current.channelPriority;
    const enabled = dto.enabled ?? current.enabled;
    if (enabled && priority.length === 0) {
      throw new ConflictException(
        'Choose at least one transactional channel before activation',
      );
    }
    if (
      enabled &&
      !priority.some((channel) =>
        current.channels.some(
          (available) => available.channel === channel && available.configured,
        ),
      )
    ) {
      throw new ConflictException(
        'Configure an approved provider adapter before activating transactional dispatch',
      );
    }

    return db.$transaction(async (transaction) => {
      const updated = await transaction.commerceMessagingPolicy.update({
        where: { id: 'transactional-default' },
        data: {
          enabled,
          channelPriority: priority,
          fallbackOnDefinitiveFailure:
            dto.fallbackOnDefinitiveFailure ??
            current.fallbackOnDefinitiveFailure,
          version: { increment: 1 },
          updatedById: actor.userId,
        },
      });
      await this.audit.record(
        {
          action: 'TRANSACTIONAL_MESSAGING_POLICY_UPDATED',
          entityType: 'CommerceMessagingPolicy',
          entityId: updated.id,
          actor,
          previousValue: current,
          newValue: updated,
        },
        transaction,
      );
      return {
        ...updated,
        channels: this.adapters.readiness(await this.providerConfigs(db)),
      };
    });
  }

  async getProviderConfigs() {
    const db = await this.db();
    const configs = await db.commerceMessagingProviderConfig.findMany({
      orderBy: { channel: 'asc' },
    });
    return configs.map((config) => ({
      channel: config.channel,
      provider: config.provider,
      enabled: config.enabled,
      credentialsRotatedAt: config.credentialsRotatedAt,
      credentialKeys: this.credentialKeys(config.credentialCipher),
    }));
  }

  async updateProviderConfig(
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL',
    dto: UpdateMessagingProviderConfigDto,
    actor: UserPayload,
  ) {
    const provider = dto.provider.normalize('NFKC').trim();
    const credentials = this.normalizeCredentials(dto.credentials);
    if (!provider || Object.keys(credentials).length === 0) {
      throw new ConflictException(
        'Provider and non-empty credentials are required',
      );
    }
    const db = await this.db();
    const cipher = encryptMessagingCredentials(
      credentials,
      this.config?.get<string>('PLATFORM_DB_CREDENTIAL_KEY'),
    );
    const credentialsRotatedAt = new Date();
    return db.$transaction(async (transaction) => {
      const previous =
        await transaction.commerceMessagingProviderConfig.findUnique({
          where: { channel },
        });
      const updated = await transaction.commerceMessagingProviderConfig.upsert({
        where: { channel },
        update: {
          provider,
          credentialCipher: cipher,
          enabled: dto.enabled ?? false,
          credentialsRotatedAt,
        },
        create: {
          channel,
          provider,
          credentialCipher: cipher,
          enabled: dto.enabled ?? false,
          credentialsRotatedAt,
        },
      });
      await this.audit.record(
        {
          action: 'TRANSACTIONAL_MESSAGING_PROVIDER_CONFIG_UPDATED',
          entityType: 'CommerceMessagingProviderConfig',
          entityId: updated.id,
          actor,
          previousValue: previous
            ? {
                channel,
                provider: previous.provider,
                enabled: previous.enabled,
              }
            : undefined,
          newValue: {
            channel,
            provider: updated.provider,
            enabled: updated.enabled,
            credentialKeys: Object.keys(credentials),
            credentialsRotatedAt: updated.credentialsRotatedAt,
          },
        },
        transaction,
      );
      return {
        channel,
        provider: updated.provider,
        enabled: updated.enabled,
        credentialKeys: Object.keys(credentials),
        credentialsRotatedAt: updated.credentialsRotatedAt,
      };
    });
  }

  async eligibleMessages(limit: number) {
    const db = await this.db();
    return db.commerceMessage.findMany({
      where: {
        status: 'QUEUED',
        availableAt: { lte: new Date() },
        lockedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
  }

  /**
   * A worker can disappear after claiming a message but before recording the
   * provider outcome. Do not retry automatically: the provider may already
   * have accepted the request. Block it for an explicit, audited retry after
   * the operator confirms the provider outcome.
   */
  async blockStaleProcessing(limit: number) {
    const db = await this.db();
    const timeoutMinutes = boundedInt(
      process.env.TRANSACTIONAL_MESSAGE_PROCESSING_TIMEOUT_MINUTES,
      30,
      5,
      1_440,
    );
    const stale = await db.commerceMessage.findMany({
      where: {
        status: 'PROCESSING',
        lockedAt: {
          lt: new Date(Date.now() - timeoutMinutes * 60_000),
        },
      },
      orderBy: { lockedAt: 'asc' },
      take: Math.min(Math.max(Number(limit) || 1, 1), 500),
      select: { id: true },
    });
    if (stale.length === 0) return 0;
    const result = await db.commerceMessage.updateMany({
      where: { id: { in: stale.map(({ id }) => id) } },
      data: {
        status: 'BLOCKED',
        terminalReason:
          'Worker lease expired; provider outcome requires review',
        lastError: 'WORKER_LEASE_EXPIRED',
        failedAt: new Date(),
        completedAt: new Date(),
        lockedAt: null,
      },
    });
    return result.count;
  }

  async prepareRetry(messageId: string) {
    const db = await this.db();
    const message = await db.commerceMessage.findUniqueOrThrow({
      where: { id: messageId },
    });
    if (!['FAILED', 'BLOCKED'].includes(message.status)) {
      throw new ConflictException(
        'Only failed or blocked messages can be retried',
      );
    }
    return db.commerceMessage.update({
      where: { id: messageId },
      data: {
        status: 'QUEUED',
        lockedAt: null,
        completedAt: null,
        failedAt: null,
        terminalReason: null,
        lastError: null,
        channelPlan: [],
        routingPolicyVersion: null,
        fallbackReason: null,
      },
    });
  }

  private templatePayload(value?: Prisma.InputJsonValue) {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
  }

  private async providerConfigs(db: PrismaClient) {
    if (!db.commerceMessagingProviderConfig) return [];
    const configs = await db.commerceMessagingProviderConfig.findMany();
    return configs.map((config) => ({
      channel: config.channel,
      provider: config.provider,
      enabled: config.enabled,
      credentials: this.decryptCredentials(config.credentialCipher),
    }));
  }

  private decryptCredentials(cipher: string): MessagingCredentials | undefined {
    try {
      return decryptMessagingCredentials(
        cipher,
        this.config?.get<string>('PLATFORM_DB_CREDENTIAL_KEY'),
      );
    } catch {
      return undefined;
    }
  }

  private credentialKeys(cipher: string): string[] {
    return Object.keys(this.decryptCredentials(cipher) ?? {});
  }

  private normalizeCredentials(
    value: Record<string, string>,
  ): MessagingCredentials {
    const entries = Object.entries(value).filter(
      ([key, item]) =>
        key.normalize('NFKC').trim().length > 0 &&
        typeof item === 'string' &&
        item.normalize('NFKC').trim().length > 0,
    );
    if (entries.length !== Object.keys(value).length) {
      throw new ConflictException(
        'Messaging credentials must be non-empty strings',
      );
    }
    return Object.fromEntries(
      entries.map(([key, item]) => [
        key.normalize('NFKC').trim(),
        item.normalize('NFKC').trim(),
      ]),
    );
  }
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed >= minimum
    ? Math.min(parsed, maximum)
    : fallback;
}
