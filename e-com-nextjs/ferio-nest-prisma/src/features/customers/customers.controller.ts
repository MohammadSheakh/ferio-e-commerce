import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { CustomerQueryDto } from './customers.dto';
import { CustomersService } from './customers.service';

@Controller('admin/customers')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.CUSTOMERS_READ)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() query: CustomerQueryDto) {
    return this.customers.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.customers.detail(id);
  }
}
