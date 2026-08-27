import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import type { UserPayload } from '@app/common';
import { AuditService } from '../audit/audit.service';
import { CreateReviewBannerDto, ModerateYoutubeReviewDto, SubmitYoutubeReviewDto, UpdateReviewBannerDto } from './product-content.dto';

@Injectable()
export class ProductContentService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  private videoId(url: string) {
    const parsed = new URL(url);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) throw new BadRequestException('Only YouTube links are accepted');
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) throw new BadRequestException('Valid YouTube video link required');
    return id;
  }
  publicProduct(slug: string) {
    return this.prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true, reviewBanners: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, youtubeReviews: { where: { status: 'APPROVED' }, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], select: { id: true, youtubeUrl: true, youtubeVideoId: true, title: true, reviewerName: true, isFeatured: true } } } });
  }
  async submit(productId: string, dto: SubmitYoutubeReviewDto, user: UserPayload) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
    if (!product) throw new NotFoundException('Published product not found');
    try { return await this.prisma.productYoutubeReview.create({ data: { productId, submittedById: user.userId, youtubeUrl: dto.youtubeUrl, youtubeVideoId: this.videoId(dto.youtubeUrl), title: dto.title?.trim(), reviewerName: dto.reviewerName?.trim() } }); }
    catch { throw new ConflictException('This video was already submitted for the product'); }
  }
  adminReviews() { return this.prisma.productYoutubeReview.findMany({ include: { product: { select: { name: true } }, submittedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }); }
  async moderate(id: string, dto: ModerateYoutubeReviewDto, actor: UserPayload) {
    const review = await this.prisma.productYoutubeReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    const targetStatus = dto.status ?? review.status;
    if (targetStatus === 'REJECTED' && !dto.rejectionReason?.trim() && !review.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }
    return this.prisma.$transaction(async tx => {
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
  deleteReview(id: string) { return this.prisma.productYoutubeReview.delete({ where: { id } }); }
  banners(productId: string) { return this.prisma.productReviewBanner.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } }); }
  createBanner(productId: string, dto: CreateReviewBannerDto) { return this.prisma.productReviewBanner.create({ data: { productId, imageUrl: dto.imageUrl, altText: dto.altText?.trim(), sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true } }); }
  updateBanner(id: string, dto: UpdateReviewBannerDto) { return this.prisma.productReviewBanner.update({ where: { id }, data: dto }); }
  deleteBanner(id: string) { return this.prisma.productReviewBanner.delete({ where: { id } }); }
}
