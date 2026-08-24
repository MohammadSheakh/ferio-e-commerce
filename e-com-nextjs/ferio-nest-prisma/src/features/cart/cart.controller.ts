import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Public,
  Roles,
  RolesGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import {
  AddCartItemDto,
  ReorderDto,
  SaveCartDto,
  UpdateCartItemDto,
} from './cart.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get and revalidate the current guest cart' })
  getCart(@Headers('x-cart-token') token?: string) {
    return this.cartService.getCart(token);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a valid product variant to the guest cart' })
  addItem(
    @Body() dto: AddCartItemDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.addItem(dto, token);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Update quantity or switch to a sibling variant' })
  updateItem(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.updateItem(variantId, dto, token);
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Remove an item from the guest cart' })
  removeItem(
    @Param('variantId') variantId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.removeItem(variantId, token);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Revalidate publication, price, and stock' })
  validateCart(@Headers('x-cart-token') token?: string) {
    return this.cartService.validateCart(token);
  }

  @Post('merge')
  @UseGuards(AuthGuard)
  mergeCart(
    @User() user: UserPayload,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.mergeGuestCart(user.userId, token);
  }

  @Post('save')
  @UseGuards(AuthGuard)
  @Public()
  @ApiOperation({ summary: 'Save active cart with a custom name' })
  saveCart(
    @Body() dto: SaveCartDto,
    @Headers('x-cart-token') token?: string,
    @User() user?: UserPayload,
  ) {
    return this.cartService.saveActiveCart(dto?.name, user?.userId, token);
  }

  @Get('saved')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List user saved carts' })
  getSavedCarts(@User() user: UserPayload) {
    return this.cartService.getSavedCarts(user.userId);
  }

  @Get('saved/share/:shareToken')
  @ApiOperation({ summary: 'Get shared cart details by share token' })
  getSharedCart(@Param('shareToken') shareToken: string) {
    return this.cartService.getSharedCart(shareToken);
  }

  @Post('saved/share/:shareToken/import')
  @ApiOperation({ summary: 'Import available items from a shared cart to active cart' })
  importSharedCart(
    @Param('shareToken') shareToken: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.importSharedCart(shareToken, token);
  }

  @Post('saved/share/:shareToken/save-to-account')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Copy a shared cart to user saved carts' })
  copySharedCart(
    @Param('shareToken') shareToken: string,
    @User() user: UserPayload,
  ) {
    return this.cartService.copySharedCartToAccount(shareToken, user.userId);
  }

  @Delete('saved/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a saved cart by ID' })
  deleteSavedCart(@Param('id') id: string, @User() user: UserPayload) {
    return this.cartService.deleteSavedCart(id, user.userId);
  }

  @Post('reorder/:orderId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Reorder available items from one of your past orders into active cart' })
  reorder(
    @Param('orderId') orderId: string,
    @Body() dto: ReorderDto,
    @User() user: UserPayload,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.cartService.reorderFromOrder(
      orderId,
      dto.orderItemIds,
      token,
      user,
    );
  }
}

@ApiTags('Admin Cart Eligibility')
@Controller('admin/abandoned-carts')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.MESSAGING_READ)
export class AdminCartEligibilityController {
  constructor(private readonly cartService: CartService) {}

  @Get('eligible')
  eligible() {
    return this.cartService.listAbandonedCartEligibility();
  }
}
