import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { StoreLocationsService } from './store-locations.service';
import {
  CheckStoreAvailabilityDto,
  CreateStoreLocationDto,
  StoreQueryDto,
  UpdateStoreLocationDto,
} from './dto/store-location.dto';

@ApiTags('Store Locations')
@Controller('store-locations')
export class PublicStoreLocationsController {
  constructor(private readonly service: StoreLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List active store locations for pickup' })
  listPublicStores() {
    return this.service.listPublicStores();
  }

  @Post('check-availability')
  @ApiOperation({
    summary: 'Check store inventory stock availability for cart items',
  })
  checkStoreAvailability(@Body() dto: CheckStoreAvailabilityDto) {
    return this.service.checkStoreAvailability(dto);
  }
}

@ApiTags('Admin Store Locations')
@ApiBearerAuth()
@Controller('admin/store-locations')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.STORE_LOCATIONS_READ)
export class AdminStoreLocationsController {
  constructor(private readonly service: StoreLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all store locations and warehouses' })
  listAdminStores(@Query() query: StoreQueryDto) {
    return this.service.listAdminStores(query);
  }

  @Post()
  @Permissions(PERMISSIONS.STORE_LOCATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a new physical store location' })
  createStore(@Body() dto: CreateStoreLocationDto, @User() actor: UserPayload) {
    return this.service.createStore(dto, actor);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.STORE_LOCATIONS_MANAGE)
  @ApiOperation({ summary: 'Update physical store details' })
  updateStore(
    @Param('id') id: string,
    @Body() dto: UpdateStoreLocationDto,
    @User() actor: UserPayload,
  ) {
    return this.service.updateStore(id, dto, actor);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.STORE_LOCATIONS_MANAGE)
  @ApiOperation({ summary: 'Delete physical store location' })
  deleteStore(@Param('id') id: string, @User() actor: UserPayload) {
    return this.service.deleteStore(id, actor);
  }
}
