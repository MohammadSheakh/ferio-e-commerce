import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { UserPayload } from '@app/common';
import { AuditService } from '../audit/services/audit.service';
import { assertTenantCommerceWritable } from '../../tenancy/commerce-write-guard.util';
import { CreateReviewBannerDto, ModerateYoutubeReviewDto, SubmitYoutubeReviewDto, UpdateReviewBannerDto } from './product-content.dto';

@Injectable()
export class ProductContentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy
   * fallback outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  private videoId(url: string) {
    const parsed = new URL(url);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) throw new BadRequestException('Only YouTube links are accepted');
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) throw new BadRequestException('Valid YouTube video link required');
    return id;
  }
  async publicProduct(slug: string) {
    const db = await this.db();
    return db.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true, reviewBanners: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, youtubeReviews: { where: { status: 'APPROVED' }, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], select: { id: true, youtubeUrl: true, youtubeVideoId: true, title: true, reviewerName: true, isFeatured: true } } } });
  }
  async submit(productId: string, dto: SubmitYoutubeReviewDto, user: UserPayload) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const product = await db.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
    if (!product) throw new NotFoundException('Published product not found');
    try {
      return await db.productYoutubeReview.create({ data: { productId, submittedById: user.userId, youtubeUrl: dto.youtubeUrl, youtubeVideoId: this.videoId(dto.youtubeUrl), title: dto.title?.trim(), reviewerName: dto.reviewerName?.trim() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This video was already submitted for the product');
      }
      throw error;
    }
  }
  async adminReviews() { const db = await this.db(); return db.productYoutubeReview.findMany({ include: { product: { select: { name: true } }, submittedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }); }
  async moderate(id: string, dto: ModerateYoutubeReviewDto, actor: UserPayload) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const review = await db.productYoutubeReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    const targetStatus = dto.status ?? review.status;
    if (targetStatus === 'REJECTED' && !dto.rejectionReason?.trim() && !review.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }
    return db.$transaction(async tx => {
      if (dto.isFeatured) {
        await tx.productYoutubeReview.updateMany({
          where: { productId: review.productId, id: { not: id } },
          data: { isFeatured: false }
        });
      }
      const updated = await tx.productYoutubeReview.update({
        where: { id },
        data: {
          status: targetStatus,
          isFeatured: dto.isFeatured !== undefined ? (targetStatus === 'APPROVED' ? dto.isFeatured : false) : review.isFeatured,
          rejectionReason: targetStatus === 'REJECTED' ? (dto.rejectionReason?.trim() ?? review.rejectionReason) : null,
          title: dto.title?.trim() ?? review.title,
          reviewerName: dto.reviewerName?.trim() ?? review.reviewerName,
          moderatedById: actor.userId,
          moderatedAt: new Date()
        }
      });
      await this.audit.record({ action: 'YOUTUBE_REVIEW_MODERATED', entityType: 'ProductYoutubeReview', entityId: id, actor, previousValue: review, newValue: updated }, tx);
      return updated;
    });
  }
  async deleteReview(id: string) { assertTenantCommerceWritable(); const db = await this.db(); return db.productYoutubeReview.delete({ where: { id } }); }
  async banners(productId: string) { const db = await this.db(); return db.productReviewBanner.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } }); }
  async createBanner(productId: string, dto: CreateReviewBannerDto) { assertTenantCommerceWritable(); const db = await this.db(); return db.productReviewBanner.create({ data: { productId, imageUrl: dto.imageUrl, altText: dto.altText?.trim(), sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true } }); }
  async updateBanner(id: string, dto: UpdateReviewBannerDto) { assertTenantCommerceWritable(); const db = await this.db(); return db.productReviewBanner.update({ where: { id }, data: dto }); }
  async deleteBanner(id: string) { assertTenantCommerceWritable(); const db = await this.db(); return db.productReviewBanner.delete({ where: { id } }); }
}
