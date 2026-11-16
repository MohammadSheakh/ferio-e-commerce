import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CollectionRuleDto } from '../dto/storefront.dto';

@Injectable()
export class CollectionRuleCompilerService {
  /**
   * Compiles declarative merchandising rules into an injection-safe Prisma ProductWhereInput.
   * Restricts automatically to published/active catalog items without deleted records.
   */
  compile(
    rules: CollectionRuleDto[],
    matchMode: 'ALL' | 'ANY' = 'ALL',
  ): Prisma.ProductWhereInput {
    const baseConstraint: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    if (!rules || rules.length === 0) {
      return baseConstraint;
    }

    const conditions: Prisma.ProductWhereInput[] = [];

    for (const rule of rules) {
      const clause = this.compileSingleRule(rule);
      if (clause) {
        conditions.push(clause);
      }
    }

    if (conditions.length === 0) {
      return baseConstraint;
    }

    if (matchMode === 'ANY') {
      return {
        AND: [baseConstraint, { OR: conditions }],
      };
    }

    return {
      AND: [baseConstraint, ...conditions],
    };
  }

  private compileSingleRule(rule: CollectionRuleDto): Prisma.ProductWhereInput | null {
    const val = rule.value?.trim();
    if (!val) return null;

    switch (rule.field) {
      case 'TITLE':
        if (rule.operator === 'CONTAINS') {
          return { name: { contains: val, mode: 'insensitive' } };
        }
        if (rule.operator === 'EQUALS') {
          return { name: { equals: val, mode: 'insensitive' } };
        }
        if (rule.operator === 'NOT_EQUALS') {
          return { NOT: { name: { equals: val, mode: 'insensitive' } } };
        }
        return null;

      case 'CATEGORY_ID':
        if (rule.operator === 'EQUALS') {
          return { categoryId: val };
        }
        if (rule.operator === 'NOT_EQUALS') {
          return { NOT: { categoryId: val } };
        }
        if (rule.operator === 'IN_LIST') {
          const ids = val.split(',').map((s) => s.trim()).filter(Boolean);
          return { categoryId: { in: ids } };
        }
        return null;

      case 'BRAND_ID':
        if (rule.operator === 'EQUALS') {
          return { brandId: val };
        }
        if (rule.operator === 'NOT_EQUALS') {
          return { NOT: { brandId: val } };
        }
        return null;

      case 'PRICE': {
        const num = parseFloat(val);
        if (isNaN(num)) return null;

        if (rule.operator === 'LESS_THAN_OR_EQUAL') {
          return { variants: { some: { price: { lte: num }, isActive: true } } };
        }
        if (rule.operator === 'GREATER_THAN') {
          return { variants: { some: { price: { gt: num }, isActive: true } } };
        }
        if (rule.operator === 'EQUALS') {
          return { variants: { some: { price: num, isActive: true } } };
        }
        return null;
      }

      case 'STOCK_QUANTITY': {
        const qty = parseInt(val, 10);
        if (isNaN(qty)) return null;

        if (rule.operator === 'GREATER_THAN') {
          return {
            variants: {
              some: {
                isActive: true,
                inventory: { some: { onHand: { gt: qty } } },
              },
            },
          };
        }
        if (rule.operator === 'LESS_THAN_OR_EQUAL') {
          return {
            variants: {
              some: {
                isActive: true,
                inventory: { some: { onHand: { lte: qty } } },
              },
            },
          };
        }
        return null;
      }

      case 'TAG':
        return {
          features: {
            some: {
              tag: { contains: val, mode: 'insensitive' },
            },
          },
        };

      default:
        return null;
    }
  }
}
