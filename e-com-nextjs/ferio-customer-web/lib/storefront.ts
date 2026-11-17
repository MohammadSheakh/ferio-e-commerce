import { getPublicApi } from "@/lib/backend";
import { CatalogCategory, CatalogProduct } from "./catalog";

export type StorefrontSectionType =
  | "HERO_SHOWCASE"
  | "CATEGORY_GRID"
  | "PRODUCT_GRID"
  | "PRODUCT_CAROUSEL"
  | "PROMOTIONAL_BANNER"
  | "PRODUCT_REQUEST_BANNER"
  | "FEEDBACK_BANNER"
  | "BRAND_SHOWCASE"
  | "TEXT_WITH_IMAGE"
  | "FLASH_SALE"
  | "CUSTOM_HTML"
  | "CUSTOM_CODE";

export type SectionSettings = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  columns?: number;
  productLimit?: number;
  showViewAll?: boolean;
  viewAllUrl?: string;
  viewAllText?: string;
  hideWhenEmpty?: boolean;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  imageUrl?: string;
  imagePosition?: "left" | "right";
  layout?: "split" | "centered" | "minimal" | "interactive";
  layoutStyle?: "tiles" | "pills" | "circles";
  background?: "paper" | "surface" | "ink";
  padding?: "compact" | "normal" | "spacious";
  showTopBorder?: boolean;
  showDiscountBadge?: boolean;
  showStockBadge?: boolean;
  promoBadge?: string;
  discountHighlight?: string;
  countdownEndTime?: string;
  showCountdown?: boolean;
  bodyText?: string;
  brandNames?: string;
  buttonText?: string;
  buttonUrl?: string;
  alignment?: "left" | "center";
  // Custom code & HTML section settings
  customHtml?: string;
  customCss?: string;
  customJs?: string;
  codeType?: "html_tailwind" | "react_component" | "raw_embed";
  containerMaxWidth?: "contained" | "full_bleed" | "narrow";
  isClientSideOnly?: boolean;
  [key: string]: unknown;
};

export type StorefrontSectionData = {
  id: string;
  type: StorefrontSectionType;
  enabled: boolean;
  sortOrder: number;
  settings: SectionSettings;
  dataSource?: Record<string, unknown> | null;
  data?: {
    categories?: CatalogCategory[];
    items?: CatalogProduct[];
    [key: string]: unknown;
  };
};

export type StorefrontPagePayload = {
  id: string;
  slug: string;
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  versionNumber: number;
  publishedAt?: string | null;
  sections: StorefrontSectionData[];
};

export type StorefrontCollectionPayload = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  type: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  totalCount: number;
  products: CatalogProduct[];
};

export async function getPublishedStorefrontPage(
  slug = "home",
  preview = false,
): Promise<StorefrontPagePayload | null> {
  try {
    const endpoint = `/storefront/pages/${slug}${preview ? "?preview=true" : ""}`;
    return await getPublicApi<StorefrontPagePayload>(endpoint, {
      next: {
        revalidate: preview ? 0 : 60,
        tags: [`storefront-page-${slug}`],
      },
      cache: preview ? "no-store" : undefined,
    });
  } catch (error) {
    console.error(`Failed to load storefront page '${slug}':`, error);
    return null;
  }
}

export async function getStorefrontCollection(
  slug: string,
): Promise<StorefrontCollectionPayload | null> {
  try {
    return await getPublicApi<StorefrontCollectionPayload>(
      `/storefront/collections/by-slug/${slug}`,
      {
        next: { revalidate: 60, tags: [`collection-${slug}`] },
      },
    );
  } catch (error) {
    console.error(`Failed to load collection '${slug}':`, error);
    return null;
  }
}

