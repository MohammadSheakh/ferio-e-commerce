import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TenantMembershipGuard } from './tenant-membership.guard';
import { ConversationController } from '../features/chatting/conversation/conversation.controller';
import { DeliveryPersonnelController } from '../features/delivery-personnel/delivery-personnel.controller';
import { SettingsController } from '../features/settings/controllers/settings.controller';

function methodGuards(controller: object, method: string): unknown[] {
  return Reflect.getMetadata(
    GUARDS_METADATA,
    (controller as Record<string, object>)[method],
  ) ?? [];
}

describe('legacy tenant-admin membership coverage', () => {
  it('protects the admin conversation directory', () => {
    expect(methodGuards(ConversationController.prototype, 'getAllConversations')).toContain(
      TenantMembershipGuard,
    );
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
    expect(methodGuards(DeliveryPersonnelController.prototype, method)).toContain(
      TenantMembershipGuard,
    );
  });
});
