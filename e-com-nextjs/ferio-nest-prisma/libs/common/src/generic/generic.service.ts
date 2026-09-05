import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginateOptions, PaginateResult } from '../shared/types/paginate';
import {
  cleanFilters,
  parseSort,
  buildProjection,
} from '../utils/prisma.utils';

type GenericObject = Record<string, unknown>;
type PrismaDelegate<TRecord = unknown> = {
  findUnique(args: GenericObject): Promise<TRecord | null>;
  findFirst(args: GenericObject): Promise<TRecord | null>;
  findMany(args: GenericObject): Promise<TRecord[]>;
  count(args?: GenericObject): Promise<number>;
  create(args: GenericObject): Promise<TRecord>;
  update(args: GenericObject): Promise<TRecord>;
  delete(args: GenericObject): Promise<TRecord>;
};

/**
 * Generic Prisma CRUD service.
 *
 * Pass a Prisma model delegate, for example `prisma.user`, from a feature service:
 *
 * ```ts
 * export class UserService extends GenericService {
 *   constructor(prisma: PrismaService) {
 *     super(prisma.user);
 *   }
 * }
 * ```
 */
@Injectable()
export class GenericService<TDelegate = unknown, TRecord = unknown> {
  protected delegate: PrismaDelegate<TRecord>;
  protected model: TDelegate;
  protected defaultSelect?: Record<string, boolean>;

  constructor(delegate: TDelegate, defaultSelect?: Record<string, boolean>) {
    this.delegate = delegate as PrismaDelegate<TRecord>;
    // Backward-compatible alias while older modules are migrated away from Mongoose.
    this.model = delegate;
    this.defaultSelect = defaultSelect;
  }

  async findById(
    id: string,
    include?: GenericObject,
    select?: Record<string, boolean>,
  ): Promise<TRecord | null> {
    this.validateId(id);

    return this.delegate.findUnique({
      where: { id },
      ...this.buildProjection(include, select),
    });
  }

  async findAll(
    filters: GenericObject = {},
    include?: GenericObject,
    select?: Record<string, boolean>,
  ): Promise<TRecord[]> {
    return this.delegate.findMany({
      where: this.cleanFilters(filters),
      ...this.buildProjection(include, select),
    });
  }

  async findAllWithPagination(
    filters: GenericObject = {},
    options: PaginateOptions,
    include?: GenericObject,
    select?: Record<string, boolean>,
  ): Promise<PaginateResult<TRecord>> {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const where = this.cleanFilters(filters);
    const orderBy = this.parseSort(options.sortBy);

    const [docs, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        ...this.buildProjection(include, select),
      }),
      this.delegate.count({ where }),
    ]);

    return {
      docs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: GenericObject): Promise<TRecord> {
    return this.delegate.create({
      data,
      ...this.buildProjection(),
    });
  }

  async updateById(id: string, data: GenericObject): Promise<TRecord | null> {
    this.validateId(id);

    try {
      return await this.delegate.update({
        where: { id },
        data,
        ...this.buildProjection(),
      });
    } catch (error) {
      this.throwNotFoundOnMissingRecord(error);
      throw error;
    }
  }

  async deleteById(id: string): Promise<TRecord> {
    this.validateId(id);

    try {
      return await this.delegate.delete({ where: { id } });
    } catch (error) {
      this.throwNotFoundOnMissingRecord(error);
      throw error;
    }
  }

  async softDeleteById(id: string): Promise<TRecord | null> {
    return this.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async count(filters: GenericObject = {}): Promise<number> {
    return this.delegate.count({ where: this.cleanFilters(filters) });
  }

  async exists(filters: GenericObject = {}): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  protected buildProjection(
    include?: GenericObject,
    select?: Record<string, boolean>,
  ): GenericObject {
    const projection = buildProjection(include, select);
    if (Object.keys(projection).length === 0 && this.defaultSelect) {
      return { select: this.defaultSelect };
    }
    return projection;
  }

  protected cleanFilters(filters: GenericObject): GenericObject {
    return cleanFilters(filters);
  }

  protected parseSort(
    sortBy?: string,
  ): Record<string, 'asc' | 'desc'> | undefined {
    return parseSort(sortBy);
  }

  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid ID');
    }
  }

  protected throwNotFoundOnMissingRecord(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Record not found');
    }
  }
}
