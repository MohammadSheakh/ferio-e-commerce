import { NotFoundException } from '@nestjs/common';
import { UserDevicesService } from './userDevices.service';

describe('UserDevicesService ownership', () => {
  function setup(device: { id: string } | null) {
    const prisma = {
      userDevices: {
        findFirst: jest.fn().mockResolvedValue(device),
        update: jest.fn().mockResolvedValue({ id: device?.id }),
      },
    };
    return {
      prisma,
      service: new UserDevicesService(prisma as never),
    };
  }

  it('scopes push-setting updates to the authenticated owner', async () => {
    const { service, prisma } = setup({ id: 'device-1' });

    await service.updatePushEnabled('user-1', 'device-1', false);

    expect(prisma.userDevices.findFirst).toHaveBeenCalledWith({
      where: { id: 'device-1', userId: 'user-1', isDeleted: false },
      select: { id: true },
    });
    expect(prisma.userDevices.update).toHaveBeenCalledWith({
      where: { id: 'device-1' },
      data: { pushEnabled: false },
    });
  });

  it('does not update a device that is not owned by the caller', async () => {
    const { service, prisma } = setup(null);

    await expect(
      service.updatePushEnabled('attacker', 'victim-device', false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.userDevices.update).not.toHaveBeenCalled();
  });
});
