import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, User } from '@app/common';
import type { UserPayload } from '@app/common';
import { CreateCustomerAddressDto, LinkCustomerAccountDto, UpdateCustomerAddressDto, UpdateCustomerProfileDto } from './customer-account.dto';
import { CustomerAccountService } from './customer-account.service';

@Controller('account/commerce')
@UseGuards(AuthGuard)
export class CustomerAccountController {
  constructor(private readonly account: CustomerAccountService) {}

  @Get()
  profile(@User() actor: UserPayload) {
    return this.account.profile(actor);
  }

  @Put('profile')
  updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @User() actor: UserPayload,
  ) {
    return this.account.updateProfile(dto, actor);
  }

  @Post('link')
  link(@Body() dto: LinkCustomerAccountDto, @User() actor: UserPayload) {
    return this.account.link(dto, actor);
  }

  @Post('addresses')
  addAddress(
    @Body() dto: CreateCustomerAddressDto,
    @User() actor: UserPayload,
  ) {
    return this.account.addAddress(dto, actor);
  }

  @Put('addresses/:id')
  updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
    @User() actor: UserPayload,
  ) {
    return this.account.updateAddress(id, dto, actor);
  }

  @Delete('addresses/:id')
  deleteAddress(
    @Param('id') id: string,
    @User() actor: UserPayload,
  ) {
    return this.account.deleteAddress(id, actor);
  }
}
