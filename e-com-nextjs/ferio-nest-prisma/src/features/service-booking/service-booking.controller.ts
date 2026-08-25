import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  NotFoundException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import { ServiceBookingService } from './service-booking.service';
import { CommerceSettingsService } from '../settings/services/commerce-settings.service';
import {
  CreateBookingDto,
  SaveServiceDto,
  UpdateBookingStatusDto,
} from './service-booking.dto';

@Controller('services')
export class PublicServiceController {
  constructor(
    private readonly service: ServiceBookingService,
    private readonly settings: CommerceSettingsService,
  ) {}

  @Get()
  async all() {
    if (!(await this.settings.get()).serviceBookingEnabled) return [];
    return this.service.publicServices();
  }

  @Get(':slug')
  async one(@Param('slug') slug: string) {
    if (!(await this.settings.get()).serviceBookingEnabled) {
      throw new NotFoundException('Service booking is unavailable');
    }
    return this.service.service(slug);
  }

  @Post('bookings/request')
  async book(@Body() dto: CreateBookingDto) {
    if (!(await this.settings.get()).serviceBookingEnabled) {
      throw new ServiceUnavailableException(
        'Service booking is temporarily unavailable',
      );
    }
    return this.service.book(dto);
  }
}

@Controller('admin/services')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.SERVICES_READ)
export class AdminServiceController {
  constructor(private readonly service: ServiceBookingService) {}

  @Get()
  all() {
    return this.service.adminServices();
  }

  @Post()
  @Permissions(PERMISSIONS.SERVICES_MANAGE)
  create(@Body() dto: SaveServiceDto) {
    return this.service.save(dto);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.SERVICES_MANAGE)
  update(@Param('id') id: string, @Body() dto: SaveServiceDto) {
    return this.service.save(dto, id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.SERVICES_MANAGE)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('bookings/all')
  bookings() {
    return this.service.bookings();
  }

  @Patch('bookings/:id/status')
  @Permissions(PERMISSIONS.SERVICES_MANAGE)
  status(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @User() user: UserPayload,
  ) {
    return this.service.status(id, dto, user);
  }
}
