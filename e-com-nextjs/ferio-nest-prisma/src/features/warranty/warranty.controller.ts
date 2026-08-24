import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import { memoryStorage } from 'multer';
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
import { CloudinaryStrategy } from '../attachments/strategies/cloudinary.strategy';
import { WarrantyService } from './warranty.service';
import { CommerceSettingsService } from '../settings/services/commerce-settings.service';
import {
  CreateWarrantyClaimDto,
  UpdateWarrantyClaimDto,
  VerifyWarrantyOrderDto,
  WarrantyClaimQueryDto,
} from './warranty.dto';

@Controller('warranty')
@UseGuards(AuthGuard)
export class WarrantyController {
  constructor(
    private readonly service: WarrantyService,
    private readonly upload: CloudinaryStrategy,
    private readonly settings: CommerceSettingsService,
  ) {}

  private async assertSubmissionEnabled() {
    if (!(await this.settings.get()).warrantyClaimsEnabled) {
      throw new ServiceUnavailableException(
        'New warranty claims are temporarily unavailable',
      );
    }
  }

  @Post('order-items')
  async items(@Body() dto: VerifyWarrantyOrderDto) {
    await this.assertSubmissionEnabled();
    return this.service.eligible(dto);
  }

  @Post('evidence/upload')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, done) =>
        done(
          null,
          ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
        ),
    }),
  )
  async evidence(@UploadedFiles() files: Express.Multer.File[]) {
    await this.assertSubmissionEnabled();
    if (!files?.length) {
      throw new BadRequestException(
        'Upload at least one JPG, PNG, or WebP image',
      );
    }
    const uploaded = await Promise.all(
      files.map((file) => this.upload.uploadFile(file, 'warranty')),
    );
    return uploaded.map((file) => ({
      imageUrl: file.url,
      publicId: file.publicId,
    }));
  }

  @Post('claims')
  async create(@Body() dto: CreateWarrantyClaimDto, @User() user: UserPayload) {
    await this.assertSubmissionEnabled();
    return this.service.create(dto, user);
  }

  @Get('claims/mine')
  mine(@User() user: UserPayload) {
    return this.service.mine(user);
  }
}

@Controller('admin/warranty')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.WARRANTY_READ)
export class AdminWarrantyController {
  constructor(private readonly service: WarrantyService) {}

  @Get()
  all(@Query() query: WarrantyClaimQueryDto) {
    return this.service.all(query);
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.WARRANTY_MANAGE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWarrantyClaimDto,
    @User() user: UserPayload,
  ) {
    return this.service.update(id, dto, user);
  }
}
