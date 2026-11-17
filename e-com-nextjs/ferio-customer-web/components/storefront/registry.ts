import { ComponentType } from "react";
import HeroSection from "./HeroSection";
import CategoryGridSection from "./CategoryGridSection";
import ProductGridSection from "./ProductGridSection";
import ProductCarouselSection from "./ProductCarouselSection";
import FlashSaleSection from "./FlashSaleSection";
import BrandShowcaseSection from "./BrandShowcaseSection";
import TextWithImageSection from "./TextWithImageSection";
import ProductRequestBanner from "@/components/ProductRequestBanner";
import FeedbackBanner from "@/components/FeedbackBanner";
import CustomCodeSection from "./CustomCodeSection";
import { StorefrontSectionType } from "@/lib/storefront";

export const sectionRegistry: Record<StorefrontSectionType, ComponentType<any>> = {
  HERO_SHOWCASE: HeroSection,
  CATEGORY_GRID: CategoryGridSection,
  PRODUCT_GRID: ProductGridSection,
  PRODUCT_CAROUSEL: ProductCarouselSection,
  FLASH_SALE: FlashSaleSection,
  PRODUCT_REQUEST_BANNER: ProductRequestBanner,
  FEEDBACK_BANNER: FeedbackBanner,
  PROMOTIONAL_BANNER: ProductGridSection,
  BRAND_SHOWCASE: BrandShowcaseSection,
  TEXT_WITH_IMAGE: TextWithImageSection,
  CUSTOM_HTML: CustomCodeSection,
  CUSTOM_CODE: CustomCodeSection,
};
