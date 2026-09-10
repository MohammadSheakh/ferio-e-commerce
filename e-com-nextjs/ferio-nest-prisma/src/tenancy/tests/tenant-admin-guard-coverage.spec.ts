import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TenantMembershipGuard } from '../guards/tenant-membership.guard';
import { ConversationController } from '../../features/chatting/conversation/conversation.controller';
import { DeliveryPersonnelController } from '../../features/delivery-personnel/delivery-personnel.controller';
import { SettingsController } from '../../features/settings/controllers/settings.controller';
import { SocketAuthController } from '../../features/socket-gateway/controllers/socket-auth.controller';

function methodGuards(controller: object, method: string): unknown[] {
  const metadata: unknown = Reflect.getMetadata(
    GUARDS_METADATA,
    (controller as Record<string, object>)[method],
  );
  return Array.isArray(metadata) ? metadata : [];
}

describe('legacy tenant-admin membership coverage', () => {
  it('protects authenticated socket ticket issuance', () => {
    expect(
      methodGuards(SocketAuthController.prototype, 'issueAuthenticatedTicket'),
    ).toContain(TenantMembershipGuard);
  });

  it('protects the admin conversation directory', () => {
    expect(
      methodGuards(ConversationController.prototype, 'getAllConversations'),
    ).toContain(TenantMembershipGuard);
  });

  it.each([
    'createOrUpdateSettings',
    'getAllSettings',
    'getAllWithPagination',
    'getAllWithPaginationCursor',
    'deleteSettingsByType',
  ])('protects SettingsController.%s', (method) => {
    expect(methodGuards(SettingsController.prototype, method)).toContain(
      TenantMembershipGuard,
    );
  });

  it.each([
    'listAll',
    'createDirectByAdmin',
    'getDeliveryMapData',
    'clearLocationHistory',
    'updateApproval',
    'updateRiderByAdmin',
    'findOne',
    'assignOrder',
  ])('protects DeliveryPersonnelController.%s', (method) => {
    expect(
      methodGuards(DeliveryPersonnelController.prototype, method),
    ).toContain(TenantMembershipGuard);
  });
});
