"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import Link from "next/link";
import ImagePicker from "@/components/ImagePicker";

function getActiveStoreSlug(): string {
  if (typeof window === "undefined") return "test";
  const cookieMatch = document.cookie.match(/(?:^|;\s*)ferio_store_slug=([^;]+)/);
  if (cookieMatch && cookieMatch[1]) {
    return decodeURIComponent(cookieMatch[1]).trim().toLowerCase();
  }
  return localStorage.getItem("ferio_store_slug") || "test";
}

function getExternalStorefrontUrl(storeSlug: string): string {
  if (typeof window === "undefined") return "/?preview=true";
  const { protocol, hostname } = window.location;
  if (hostname.startsWith("adminf.")) {
    const rootDomain = hostname.replace("adminf.", "");
    return `${protocol}//${storeSlug}.${rootDomain}/?preview=true`;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//localhost:3000/?preview=true`;
  }
  return `${protocol}//${storeSlug}.${hostname}/?preview=true`;
}

function getStudioCanvasPreviewUrl(storeSlug: string, versionKey: number): string {
  const base = getExternalStorefrontUrl(storeSlug);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${versionKey}`;
}

type SectionType =
  | "HERO_SHOWCASE"
  | "CATEGORY_GRID"
  | "PRODUCT_GRID"
  | "PRODUCT_CAROUSEL"
  | "FLASH_SALE"
  | "PRODUCT_REQUEST_BANNER"
  | "FEEDBACK_BANNER"
  | "BRAND_SHOWCASE"
  | "TEXT_WITH_IMAGE"
  | "CUSTOM_HTML"
  | "CUSTOM_CODE";

type ProductSourceType =
  | "MANUAL_SELECTION"
  | "COLLECTION"
  | "LATEST_PRODUCTS"
  | "BEST_SELLERS"
  | "FLASH_SALE"
  | "ACTIVE_DISCOUNTS";

interface ChildBlock {
  id: string;
  type?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface StorefrontSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  sortOrder: number;
  settings: {
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
    variant?: "interactive" | "standard";
    layoutStyle?: "tiles" | "pills";
    background?: "paper" | "surface" | "ink" | "custom";
    customBgColor?: string;
    padding?: "compact" | "normal" | "spacious";
    showTopBorder?: boolean;
    showDiscountBadge?: boolean;
    promoBadge?: string;
    discountHighlight?: string;
    bodyText?: string;
    brandNames?: string;
    buttonText?: string;
    buttonUrl?: string;
    alignment?: "left" | "center";
    blocks?: ChildBlock[];
    [key: string]: any;
  };
  dataSource?: {
    type: ProductSourceType;
    collectionId?: string;
    [key: string]: any;
  } | null;
  data?: {
    items?: any[];
    categories?: any[];
  };
}

interface CollectionOption {
  id: string;
  name: string;
  type: string;
}

interface VersionHistoryItem {
  id: string;
  versionNumber: number;
  isPublished: boolean;
  publishedAt: string | null;
  changeSummary: string | null;
  createdAt: string;
}

interface GlobalThemeTokens {
  primaryColor: string;
  accentColor: string;
  surfaceTone: "paper" | "surface" | "contrast";
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  containerWidth: string;
  spacingDensity: "compact" | "normal" | "spacious";
}

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
  HERO_SHOWCASE: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  CATEGORY_GRID: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  PRODUCT_GRID: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  PRODUCT_CAROUSEL: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  FLASH_SALE: (
    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  ),
  PRODUCT_REQUEST_BANNER: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  FEEDBACK_BANNER: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  BRAND_SHOWCASE: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  TEXT_WITH_IMAGE: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  CUSTOM_HTML: (
    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  CUSTOM_CODE: (
    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
    </svg>
  ),
};

const AVAILABLE_SECTION_TEMPLATES: {
  type: SectionType;
  label: string;
  description: string;
  defaultSettings: Record<string, any>;
  defaultDataSource: any;
}[] = [
  {
    type: "HERO_SHOWCASE",
    label: "Interactive Hero Showcase (Initial Signature Design)",
    description: "Signature 3-card layout with interactive lifestyle photo cards, product pins, slide progression, and watermarks.",
    defaultSettings: {
      layout: "interactive",
      variant: "interactive",
      eyebrow: "SIGNATURE SHOWCASE",
      title: "МЕБЕЛЬ И АКСЕССУАРЫ ДЛЯ СОВРЕМЕННОГО ИНТЕРЬЕРА",
      subtitle: "Воспользуйтесь нашими идеями, чтобы создать интерьер, подходящий вам.",
      ctaText: "Shop collection",
      ctaUrl: "/products",
      background: "surface",
      padding: "normal",
      showTopBorder: false,
      blocks: [
        { id: "b1", title: "Velvet Sofa", subtitle: "Living Room Showcase", ctaUrl: "/products" },
        { id: "b2", title: "Centerpiece Armchair", subtitle: "Signature Edition", ctaUrl: "/products" },
        { id: "b3", title: "Ceramic Minimalist Vase", subtitle: "Decor Accents", ctaUrl: "/products" },
      ],
    },
    defaultDataSource: null,
  },
  {
    type: "HERO_SHOWCASE",
    label: "Hero Showcase Banner",
    description: "Primary visual headline with call-to-action, support for centered or split layout.",
    defaultSettings: {
      eyebrow: "NEW ARRIVALS 2026",
      title: "From our shelf to your doorstep.",
      subtitle: "Handpicked products nationwide Bangladesh with genuine warranty.",
      ctaText: "Shop collection",
      ctaUrl: "/products",
      secondaryCtaText: "Special Offers",
      secondaryCtaUrl: "/products?sale=true",
      layout: "centered",
      background: "surface",
      padding: "normal",
      showTopBorder: false,
    },
    defaultDataSource: null,
  },
  {
    type: "CATEGORY_GRID",
    label: "Shop by Category",
    description: "Grid of active product categories with tiles or rounded pills style.",
    defaultSettings: {
      eyebrow: "CATALOG BROWSER",
      title: "Shop by category",
      columns: 5,
      layoutStyle: "tiles",
      showViewAll: true,
      viewAllText: "View all →",
      viewAllUrl: "/products",
      hideWhenEmpty: true,
      background: "paper",
      padding: "normal",
      showTopBorder: true,
    },
    defaultDataSource: null,
  },
  {
    type: "PRODUCT_GRID",
    label: "Product Grid (Curated / Latest)",
    description: "Curated collection, latest arrivals, or sales-ranked best sellers in 2 to 6 columns.",
    defaultSettings: {
      eyebrow: "CURATED SELECTION",
      title: "Featured Products",
      columns: 4,
      productLimit: 8,
      showViewAll: true,
      viewAllText: "View all →",
      viewAllUrl: "/products",
      hideWhenEmpty: true,
      showDiscountBadge: true,
      background: "paper",
      padding: "normal",
      showTopBorder: true,
      alignment: "left",
    },
    defaultDataSource: { type: "COLLECTION" },
  },
  {
    type: "PRODUCT_CAROUSEL",
    label: "Product Carousel",
    description: "Horizontal scrollable row of featured or trending products.",
    defaultSettings: {
      eyebrow: "TRENDING NOW",
      title: "Trending Items",
      productLimit: 12,
      showViewAll: true,
      viewAllText: "View all →",
      viewAllUrl: "/products",
      hideWhenEmpty: true,
      background: "paper",
      padding: "normal",
      showTopBorder: true,
    },
    defaultDataSource: { type: "LATEST_PRODUCTS" },
  },
  {
    type: "FLASH_SALE",
    label: "Flash Sale Countdown",
    description: "Time-limited promotion showcase with urgency badge and countdown banner.",
    defaultSettings: {
      promoBadge: "FLASH DEAL",
      eyebrow: "LIMITED TIME",
      title: "Flash Sale",
      discountHighlight: "Save up to 50% on selected tech.",
      subtitle: "Offers available while stocks last.",
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllText: "View all deals →",
      viewAllUrl: "/products?sale=true",
      hideWhenEmpty: true,
      background: "paper",
      padding: "normal",
      showTopBorder: true,
    },
    defaultDataSource: { type: "FLASH_SALE" },
  },
  {
    type: "TEXT_WITH_IMAGE",
    label: "Brand Story & Trust",
    description: "Editorial storytelling section with image, policy highlights, and trust guarantees.",
    defaultSettings: {
      eyebrow: "OUR GUARANTEE",
      title: "Crafted for durability & authenticity",
      bodyText: "Every item in our collection is rigorously verified for authenticity. We partner directly with authorized distributors to eliminate counterfeits and guarantee satisfaction.",
      ctaText: "Learn our standards",
      ctaUrl: "/about",
      imagePosition: "right",
      background: "paper",
      padding: "normal",
      showTopBorder: true,
    },
    defaultDataSource: null,
  },
  {
    type: "BRAND_SHOWCASE",
    label: "Authorized Brands Grid",
    description: "Display partner and authorized brand logos or minimal typographic tiles.",
    defaultSettings: {
      eyebrow: "OFFICIAL PARTNERS",
      title: "Authorized Brands",
      brandNames: "Apple, Samsung, Sony, Anker, Baseus, Xiaomi",
      columns: 6,
      background: "paper",
      padding: "normal",
      showTopBorder: true,
    },
    defaultDataSource: null,
  },
  {
    type: "PRODUCT_REQUEST_BANNER",
    label: "Product Request Banner",
    description: "Interactive banner inviting customers to request unlisted products.",
    defaultSettings: {
      title: "Looking for something specific?",
      subtitle: "Let us know what you need and we will source it for you nationwide.",
      buttonText: "Request product",
      hideWhenEmpty: false,
      background: "surface",
      padding: "compact",
      showTopBorder: true,
    },
    defaultDataSource: null,
  },
  {
    type: "FEEDBACK_BANNER",
    label: "Feedback & Wishes Banner",
    description: "Collect suggestions, well wishes, and feedback directly from shoppers.",
    defaultSettings: {
      title: "Share your feedback & well wishes",
      subtitle: "Help us refine our service and product selections.",
      buttonText: "Send feedback",
      hideWhenEmpty: false,
      background: "surface",
      padding: "compact",
      showTopBorder: true,
    },
    defaultDataSource: null,
  },
  {
    type: "CUSTOM_HTML",
    label: "Custom HTML & Tailwind CSS",
    description: "Write custom HTML styled directly with full Tailwind CSS classes, responsive breakpoints, inline styles, and SVG graphics.",
    defaultSettings: {
      title: "Custom HTML & Tailwind Section",
      codeType: "html_tailwind",
      containerMaxWidth: "contained",
      customHtml: `<div class="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
  <div class="max-w-xl relative z-10">
    <span class="inline-block px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold uppercase tracking-wider mb-3">Tailwind CSS Section</span>
    <h3 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Build Anything You Imagine</h3>
    <p class="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">Full access to Tailwind utility classes, custom markup, SVG icons, and responsive layouts. Design custom promo cards, trust bars, or feature banners.</p>
    <div class="mt-6 flex flex-wrap gap-4">
      <a href="/products" class="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg shadow hover:bg-slate-100 transition-colors">Shop Now</a>
      <a href="/services" class="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors">Our Services</a>
    </div>
  </div>
</div>`,
      customCss: `/* Scoped custom CSS for this section */
.custom-section-content a {
  text-decoration: none;
}`,
      background: "paper",
      padding: "normal",
      showTopBorder: false,
    },
    defaultDataSource: null,
  },
  {
    type: "CUSTOM_CODE",
    label: "Custom React / Client Component",
    description: "Interactive client-side React / JavaScript component with dynamic click handlers, state, counters, or third-party embeds.",
    defaultSettings: {
      title: "Interactive Client Widget",
      codeType: "react_component",
      containerMaxWidth: "contained",
      customHtml: `<div class="border border-line rounded-xl p-6 sm:p-8 bg-surface">
  <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
    <div>
      <h4 class="font-bold text-ink text-lg sm:text-xl">Live Interactive Experience</h4>
      <p class="text-xs sm:text-sm text-ink2 mt-1">Execute client-side component code and micro-interactions directly inside the storefront.</p>
    </div>
    <span id="interactive-counter-badge" class="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">0 Clicks</span>
  </div>
  <div class="pt-2 flex items-center gap-3">
    <button id="interactive-action-btn" class="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all shadow-sm">
      ⚡ Test Interaction
    </button>
  </div>
</div>`,
      customJs: `// Custom Client-side React/JS Widget Logic
const btn = container.querySelector('#interactive-action-btn');
const badge = container.querySelector('#interactive-counter-badge');
let count = 0;
if (btn && badge) {
  btn.onclick = () => {
    count++;
    badge.textContent = count + (count === 1 ? ' Click' : ' Clicks');
    badge.className = 'px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 animate-pulse';
  };
}`,
      background: "paper",
      padding: "normal",
      showTopBorder: false,
    },
    defaultDataSource: null,
  },
];

const SNIPPET_PRESETS: Record<string, { label: string; html: string; css?: string; js?: string }> = {
  tailwind_card: {
    label: "Tailwind Promo Card",
    html: `<div class="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
  <div class="max-w-xl relative z-10">
    <span class="inline-block px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold uppercase tracking-wider mb-3">Tailwind CSS</span>
    <h3 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Elevate Your Lifestyle</h3>
    <p class="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">Handcrafted minimalist essentials tailored for contemporary living. Engineered for comfort and longevity.</p>
    <div class="mt-6 flex flex-wrap gap-4">
      <a href="/products" class="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg shadow hover:bg-slate-100 transition-colors">Shop Now</a>
      <a href="/services" class="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors">Our Services</a>
    </div>
  </div>
</div>`,
    css: `/* Scoped custom styling */
.custom-section-content a {
  text-decoration: none;
}`,
  },
  feature_grid: {
    label: "3-Column Feature Grid",
    html: `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all">
    <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 font-bold text-lg">🚚</div>
    <h4 class="font-bold text-ink text-base">Express Delivery</h4>
    <p class="text-xs text-ink2 mt-2 leading-relaxed">Next-day courier dispatch across all major metropolitan delivery zones nationwide.</p>
  </div>
  <div class="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all">
    <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 font-bold text-lg">🛡️</div>
    <h4 class="font-bold text-ink text-base">Genuine Warranty</h4>
    <p class="text-xs text-ink2 mt-2 leading-relaxed">Every item verified authentic with official manufacturer warranty coverage.</p>
  </div>
  <div class="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all">
    <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4 font-bold text-lg">💳</div>
    <h4 class="font-bold text-ink text-base">Flexible Payments</h4>
    <p class="text-xs text-ink2 mt-2 leading-relaxed">Cash on Delivery, mobile banking (bKash/Nagad), and multi-currency card checkout.</p>
  </div>
</div>`,
  },
  interactive_counter: {
    label: "Interactive Client Widget",
    html: `<div class="border border-line rounded-xl p-6 sm:p-8 bg-surface">
  <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
    <div>
      <h4 class="font-bold text-ink text-lg sm:text-xl">Interactive Experience</h4>
      <p class="text-xs sm:text-sm text-ink2 mt-1">Execute client-side component code and micro-interactions directly inside the storefront.</p>
    </div>
    <span id="interactive-counter-badge" class="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100 font-mono">0 Clicks</span>
  </div>
  <div class="pt-2 flex items-center gap-3">
    <button id="interactive-action-btn" class="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all shadow-sm">
      ⚡ Click to Test
    </button>
  </div>
</div>`,
    js: `// Client-side JavaScript / React Logic
const btn = container.querySelector('#interactive-action-btn');
const badge = container.querySelector('#interactive-counter-badge');
let count = 0;
if (btn && badge) {
  btn.onclick = () => {
    count++;
    badge.textContent = count + (count === 1 ? ' Click' : ' Clicks');
    badge.className = 'px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 font-mono animate-pulse';
  };
}`,
  },
  trust_bar: {
    label: "Trust Badges & Social Proof",
    html: `<div class="flex flex-wrap items-center justify-around gap-6 py-4 px-6 rounded-xl bg-slate-50 border border-line">
  <div class="flex items-center gap-2">
    <span class="text-emerald-500 font-bold text-lg">✓</span>
    <span class="text-xs font-medium text-ink">100% Authentic Products</span>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-blue-500 font-bold text-lg">★</span>
    <span class="text-xs font-medium text-ink">4.9 / 5.0 Merchant Rating</span>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-amber-500 font-bold text-lg">↺</span>
    <span class="text-xs font-medium text-ink">7-Day Easy Returns</span>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-purple-500 font-bold text-lg">🔒</span>
    <span class="text-xs font-medium text-ink">SSL Encrypted Checkout</span>
  </div>
</div>`,
  },
  video_embed: {
    label: "Responsive Video Embed",
    html: `<div class="relative w-full rounded-2xl overflow-hidden shadow-lg border border-line bg-black" style="padding-top: 56.25%;">
  <iframe
    class="absolute top-0 left-0 w-full h-full"
    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    title="Featured Video"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>`,
  },
};

export default function StorefrontStudioPage() {
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Viewport Device Breakpoint (Desktop 1280px, Tablet 768px, Mobile 375px)
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  // Interaction Mode: "edit" (clicks select section) vs "interact" (live store test)
  const [interactionMode, setInteractionMode] = useState<"edit" | "interact">("edit");
  // Canvas View Mode: Live Preview vs Structural DOM Outliner
  const [previewTab, setPreviewTab] = useState<"interactive" | "outliner">("interactive");

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSectionIndex, setAddSectionIndex] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showThemeSettingsModal, setShowThemeSettingsModal] = useState(false);
  
  // Page Template Switcher
  const [selectedTemplate, setSelectedTemplate] = useState<"home" | "product" | "collection" | "cart">("home");

  // Collapsible Accordions in Right Inspector
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    customCode: true,
    typography: true,
    layout: true,
    datasource: true,
    specialty: true,
    styling: true,
    media: true,
    blocks: true,
  });

  // Active code editor tab (HTML & Tailwind vs Scoped CSS vs Client JS)
  const [activeCodeTab, setActiveCodeTab] = useState<"html" | "css" | "js">("html");
  const [showFullscreenCodeEditor, setShowFullscreenCodeEditor] = useState<boolean>(false);

  // Tab key indentation handler for professional code editing experience
  const handleCodeKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    key: "customHtml" | "customCss" | "customJs"
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      updateSettings(key, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Expanded block groups in Left Sidebar
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Global Theme Tokens
  const [themeTokens, setThemeTokens] = useState<GlobalThemeTokens>({
    primaryColor: "#111114",
    accentColor: "#2563eb",
    surfaceTone: "paper",
    headingFont: "Inter",
    bodyFont: "Inter",
    borderRadius: "8px",
    containerWidth: "1280px",
    spacingDensity: "normal",
  });

  const [historyList, setHistoryList] = useState<VersionHistoryItem[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState(1);
  const [hasSignatureTemplate, setHasSignatureTemplate] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [activeStoreSlug, setActiveStoreSlug] = useState<string>("test");
  const initialSnapshotRef = useRef<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [, startTransition] = useTransition();

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSectionBlocksExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectSectionAndScroll = (id: string) => {
    setSelectedSectionId(id);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "FERIO_STUDIO_SCROLL_SECTION",
            sectionId: id,
          },
          "*",
        );
      } catch (e) {}
    }
  };

  // Broadcast interaction mode to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "FERIO_STUDIO_SET_INTERACTION_MODE",
            mode: interactionMode,
          },
          "*",
        );
      } catch (e) {}
    }
  }, [interactionMode]);

  // Real-Time 2-Way Sync: broadcast section edits to live preview canvas immediately
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        {
          type: "FERIO_STUDIO_SYNC_SECTIONS",
          sections: sections.map((s, idx) => ({
            id: s.id,
            type: s.type,
            enabled: s.enabled,
            sortOrder: idx,
            settings: s.settings || {},
            dataSource: s.dataSource || null,
          })),
        },
        "*",
      );
    } catch (e) {}
  }, [sections]);

  // Two-way interactive link: iframe tells studio when ready or when a section is clicked
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "FERIO_STOREFRONT_READY") {
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              {
                type: "FERIO_STUDIO_SYNC_SECTIONS",
                sections: sections.map((s, idx) => ({
                  id: s.id,
                  type: s.type,
                  enabled: s.enabled,
                  sortOrder: idx,
                  settings: s.settings || {},
                  dataSource: s.dataSource || null,
                })),
              },
              "*",
            );
            iframeRef.current.contentWindow.postMessage(
              {
                type: "FERIO_STUDIO_SET_INTERACTION_MODE",
                mode: interactionMode,
              },
              "*",
            );
          } catch (err) {}
        }
      } else if (e.data.type === "FERIO_STOREFRONT_SECTION_CLICKED") {
        if (e.data.sectionId) {
          setSelectedSectionId(e.data.sectionId);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sections, interactionMode]);

  const serializeSections = (list: StorefrontSection[]) =>
    JSON.stringify(
      list.map((s) => ({
        id: s.id,
        type: s.type,
        enabled: s.enabled,
        sortOrder: s.sortOrder,
        settings: s.settings || {},
        dataSource: s.dataSource || null,
      })),
    );

  const isDirty =
    initialSnapshotRef.current !== "" &&
    initialSnapshotRef.current !== serializeSections(sections);

  useEffect(() => {
    setActiveStoreSlug(getActiveStoreSlug());
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Load draft configuration
  useEffect(() => {
    async function loadStudio() {
      setLoading(true);
      try {
        const [draftRes, colRes] = await Promise.all([
          fetch("/api/storefront/draft", { cache: "no-store" }),
          fetch("/api/catalog/collections", { cache: "no-store" }),
        ]);

        const draftPayload = await draftRes.json();
        const colPayload = await colRes.json();

        if (draftPayload.data?.sections) {
          setSections(draftPayload.data.sections);
          if (draftPayload.data.sections.length > 0) {
            setSelectedSectionId(draftPayload.data.sections[0].id);
          }
          setActiveVersionNumber(draftPayload.data.draftVersionNumber || 1);
          setHasSignatureTemplate(Boolean(draftPayload.data.hasSignatureTemplate));
          initialSnapshotRef.current = serializeSections(draftPayload.data.sections);
        }

        if (colPayload.data?.items) {
          setCollections(colPayload.data.items);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load storefront studio.");
      } finally {
        setLoading(false);
      }
    }
    loadStudio();
  }, []);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const updateSettings = (key: string, value: any) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === selectedSectionId
          ? {
              ...sec,
              settings: {
                ...sec.settings,
                [key]: value,
              },
            }
          : sec,
      ),
    );
  };

  const updateDataSource = (key: string, value: any) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === selectedSectionId
          ? {
              ...sec,
              dataSource: {
                ...(sec.dataSource || { type: "COLLECTION" }),
                [key]: value,
              },
            }
          : sec,
      ),
    );
  };

  const toggleSectionEnabled = (id: string) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec,
      ),
    );
  };

  const moveSection = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const item = next[fromIndex];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next.map((s, idx) => ({ ...s, sortOrder: idx }));
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    setSections((prev) => {
      const next = [...prev];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, item);
      return next.map((s, idx) => ({ ...s, sortOrder: idx }));
    });
    setDraggedIndex(null);
  };

  const removeSection = (id: string) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, idx) => ({ ...s, sortOrder: idx }));
    });
    if (selectedSectionId === id) {
      setSelectedSectionId(null);
    }
  };

  const duplicateSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = sections.find((s) => s.id === id);
    if (!target) return;
    const copy: StorefrontSection = {
      ...target,
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      settings: {
        ...target.settings,
        title: target.settings?.title ? `${target.settings.title} (Copy)` : undefined,
      },
    };
    const idx = sections.findIndex((s) => s.id === id);
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    setSections(next.map((s, i) => ({ ...s, sortOrder: i })));
    setSelectedSectionId(copy.id);
  };

  const openAddSectionAtIndex = (index: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddSectionIndex(index);
    setShowAddModal(true);
  };

  const addSection = (template: (typeof AVAILABLE_SECTION_TEMPLATES)[0]) => {
    const newSection: StorefrontSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: template.type,
      enabled: true,
      sortOrder: sections.length,
      settings: { ...template.defaultSettings },
      dataSource: template.defaultDataSource ? { ...template.defaultDataSource } : null,
    };

    setSections((prev) => {
      const next = [...prev];
      if (addSectionIndex !== null && addSectionIndex >= 0 && addSectionIndex <= next.length) {
        next.splice(addSectionIndex, 0, newSection);
      } else {
        next.push(newSection);
      }
      return next.map((s, idx) => ({ ...s, sortOrder: idx }));
    });

    setSelectedSectionId(newSection.id);
    setShowAddModal(false);
    setAddSectionIndex(null);
  };

  // Block management
  const addBlockToSelected = () => {
    if (!selectedSectionId) return;
    const newBlock: ChildBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: "New Item Block",
      subtitle: "Custom highlight",
      ctaUrl: "/products",
    };
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== selectedSectionId) return sec;
        const currentBlocks = sec.settings?.blocks || [];
        return {
          ...sec,
          settings: {
            ...sec.settings,
            blocks: [...currentBlocks, newBlock],
          },
        };
      }),
    );
  };

  const updateBlock = (blockId: string, key: keyof ChildBlock, val: string) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== selectedSectionId) return sec;
        const blocks = (sec.settings?.blocks || []).map((b) =>
          b.id === blockId ? { ...b, [key]: val } : b,
        );
        return {
          ...sec,
          settings: { ...sec.settings, blocks },
        };
      }),
    );
  };

  const removeBlock = (blockId: string) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== selectedSectionId) return sec;
        const blocks = (sec.settings?.blocks || []).filter((b) => b.id !== blockId);
        return {
          ...sec,
          settings: { ...sec.settings, blocks },
        };
      }),
    );
  };

  // Preset Handlers
  const applyInitialDesignTemplate = () => {
    if (!hasSignatureTemplate) {
      alert("This template requires platform administrator provisioning for this specific tenant.");
      return;
    }
    if (sections.length > 0 && !confirm("Re-apply the Signature Initial Design template? This will replace current sections in working draft.")) {
      return;
    }
    const templateSections: StorefrontSection[] = [
      {
        id: `sec_${Date.now()}_0`,
        type: "HERO_SHOWCASE",
        enabled: true,
        sortOrder: 0,
        settings: {
          layout: "interactive",
          variant: "interactive",
          eyebrow: "SIGNATURE SHOWCASE",
          title: "МЕБЕЛЬ И АКСЕССУАРЫ ДЛЯ СОВРЕМЕННОГО ИНТЕРЬЕРА",
          subtitle: "Воспользуйтесь нашими идеями, чтобы создать интерьер, подходящий вам.",
          ctaText: "Shop collection",
          ctaUrl: "/products",
          background: "surface",
          padding: "normal",
          showTopBorder: false,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_1`,
        type: "CATEGORY_GRID",
        enabled: true,
        sortOrder: 1,
        settings: {
          eyebrow: "CATALOG BROWSER",
          title: "Shop by category",
          columns: 5,
          layoutStyle: "tiles",
          showViewAll: true,
          viewAllText: "View all →",
          viewAllUrl: "/products",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_2`,
        type: "PRODUCT_GRID",
        enabled: true,
        sortOrder: 2,
        settings: {
          eyebrow: "CURATED SELECTION",
          title: "Featured products",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "LATEST_PRODUCTS" },
      },
      {
        id: `sec_${Date.now()}_3`,
        type: "PRODUCT_REQUEST_BANNER",
        enabled: true,
        sortOrder: 3,
        settings: {
          title: "Looking for something specific?",
          subtitle: "Let us know what you need and we will source it for you nationwide.",
          buttonText: "Request product",
          hideWhenEmpty: false,
          background: "surface",
          padding: "compact",
          showTopBorder: true,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_4`,
        type: "FEEDBACK_BANNER",
        enabled: true,
        sortOrder: 4,
        settings: {
          title: "Share your suggestions & wishes",
          subtitle: "Help us refine our service and product selections.",
          buttonText: "Send feedback",
          hideWhenEmpty: false,
          background: "surface",
          padding: "compact",
          showTopBorder: true,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_5`,
        type: "PRODUCT_GRID",
        enabled: true,
        sortOrder: 5,
        settings: {
          eyebrow: "SPECIAL OFFERS",
          title: "Exclusive deals",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products?sale=true",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "FLASH_SALE" },
      },
      {
        id: `sec_${Date.now()}_6`,
        type: "PRODUCT_GRID",
        enabled: true,
        sortOrder: 6,
        settings: {
          eyebrow: "NEW ARRIVALS",
          title: "Latest products",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products?sort=newest",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "LATEST_PRODUCTS" },
      },
      {
        id: `sec_${Date.now()}_7`,
        type: "PRODUCT_GRID",
        enabled: true,
        sortOrder: 7,
        settings: {
          eyebrow: "TOP RANKED",
          title: "Best sellers",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "BEST_SELLERS" },
      },
      {
        id: `sec_${Date.now()}_8`,
        type: "FLASH_SALE",
        enabled: true,
        sortOrder: 8,
        settings: {
          promoBadge: "FLASH DEAL",
          eyebrow: "LIMITED TIME",
          title: "Flash sale",
          discountHighlight: "Save up to 50% on selected items.",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products?sale=true",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "FLASH_SALE" },
      },
    ];
    setSections(templateSections);
    setSelectedSectionId(templateSections[0].id);
    setShowTemplateModal(false);
  };

  const applyModernRetailTemplate = () => {
    if (sections.length > 0 && !confirm("Apply the Modern Retail template? This will replace current sections in working draft.")) {
      return;
    }
    const templateSections: StorefrontSection[] = [
      {
        id: `sec_${Date.now()}_0`,
        type: "HERO_SHOWCASE",
        enabled: true,
        sortOrder: 0,
        settings: {
          layout: "split",
          eyebrow: "SPRING COLLECTION 2026",
          title: "Modern essentials engineered to last.",
          subtitle: "Explore certified tech, home, and lifestyle gear backed by official warranties.",
          ctaText: "Shop featured collection",
          ctaUrl: "/products",
          secondaryCtaText: "Special Offers",
          secondaryCtaUrl: "/products?sale=true",
          background: "surface",
          padding: "spacious",
          showTopBorder: false,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_1`,
        type: "CATEGORY_GRID",
        enabled: true,
        sortOrder: 1,
        settings: {
          title: "Explore categories",
          columns: 5,
          layoutStyle: "tiles",
          showViewAll: true,
          viewAllText: "View all →",
          viewAllUrl: "/products",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_2`,
        type: "PRODUCT_CAROUSEL",
        enabled: true,
        sortOrder: 2,
        settings: {
          eyebrow: "POPULAR NOW",
          title: "Trending in store",
          productLimit: 10,
          showViewAll: true,
          viewAllText: "View all →",
          viewAllUrl: "/products",
          hideWhenEmpty: true,
          background: "paper",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "BEST_SELLERS" },
      },
      {
        id: `sec_${Date.now()}_3`,
        type: "TEXT_WITH_IMAGE",
        enabled: true,
        sortOrder: 3,
        settings: {
          eyebrow: "OUR COMMITMENT",
          title: "Guaranteed authentic & direct from verified distributors.",
          bodyText: "We take product reliability seriously. Every item passes mandatory authentication and testing before arriving safely at your door.",
          ctaText: "Learn our verification standards",
          ctaUrl: "/about",
          imagePosition: "right",
          background: "paper",
          padding: "spacious",
          showTopBorder: true,
        },
        dataSource: null,
      },
      {
        id: `sec_${Date.now()}_4`,
        type: "FLASH_SALE",
        enabled: true,
        sortOrder: 4,
        settings: {
          promoBadge: "TODAY'S SPECIAL",
          eyebrow: "LIMITED STOCK",
          title: "Daily Flash Sale",
          discountHighlight: "Direct importer prices on top accessories.",
          columns: 4,
          productLimit: 4,
          showViewAll: true,
          viewAllUrl: "/products?sale=true",
          hideWhenEmpty: true,
          background: "surface",
          padding: "normal",
          showTopBorder: true,
        },
        dataSource: { type: "FLASH_SALE" },
      },
    ];
    setSections(templateSections);
    setSelectedSectionId(templateSections[0].id);
    setShowTemplateModal(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage("");
    setError("");
    try {
      const payload = {
        sections: sections.map((s, idx) => ({
          type: s.type,
          enabled: s.enabled,
          sortOrder: idx,
          settings: s.settings || {},
          dataSource: s.dataSource || null,
        })),
      };

      const res = await fetch("/api/storefront/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save working draft.");

      initialSnapshotRef.current = serializeSections(sections);
      setStatusMessage("Draft saved");
      setTimeout(() => setStatusMessage(""), 3500);
    } catch (err: any) {
      setError(err.message || "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isDirty) {
      await handleSaveDraft();
    }
    setPublishing(true);
    setStatusMessage("");
    setError("");
    try {
      const res = await fetch("/api/storefront/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to publish storefront.");

      setActiveVersionNumber(data.data?.versionNumber || activeVersionNumber + 1);
      setStatusMessage("Published live");
      setTimeout(() => setStatusMessage(""), 3500);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message || "Unable to publish storefront.");
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenHistory = async () => {
    try {
      const res = await fetch("/api/storefront/history", { cache: "no-store" });
      const data = await res.json();
      if (data.data?.items) {
        setHistoryList(data.data.items);
      }
      setShowHistoryModal(true);
    } catch (err: any) {
      alert("Failed to load publication history.");
    }
  };

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to rollback to Version ${versionNumber}?`)) return;
    try {
      const res = await fetch("/api/storefront/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Rollback failed");
      setShowHistoryModal(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Rollback failed.");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper font-sans">
      {/* ========================================================================= */}
      {/* STUDIO TOP BAR: Enterprise Theme Editor Header (No Ops Dashboard Clutter) */}
      {/* ========================================================================= */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-paper px-4 select-none z-30">
        {/* Left Section: Context & Page Selection */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink2 hover:text-ink hover:bg-slate-50 transition"
            title="Exit Studio to Dashboard"
          >
            ←
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[14px] text-ink">Storefront Studio</span>
            <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-mono text-ink2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeStoreSlug}.sheakh.qzz.io
            </div>
          </div>

          <div className="h-4 w-[1px] bg-line mx-1 hidden sm:block" />

          {/* Page Template Switcher */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as any)}
              className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-medium text-ink focus:border-ink focus:outline-none"
            >
              <option value="home">🏠 Homepage (Default)</option>
              <option value="product">📦 Product Page (Template)</option>
              <option value="collection">🗂️ Collection (Template)</option>
              <option value="cart">🛒 Cart / Checkout</option>
            </select>
          </div>

          {/* Global Theme Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowThemeSettingsModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
            title="Configure Global Theme Tokens (Brand Colors, Typography, Spacing)"
          >
            ⚙ Theme Settings
          </button>
        </div>

        {/* Center Section: Responsive Device Viewports & Interaction Mode */}
        <div className="flex items-center gap-2.5">
          {/* Viewport Switcher: Desktop (1280px), Tablet (768px), Mobile (375px) */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                viewMode === "desktop"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
              title="Desktop View (1280px)"
            >
              🖥️ <span className="hidden md:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tablet")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                viewMode === "tablet"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
              title="Tablet View (768px)"
            >
              📱 <span className="hidden md:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                viewMode === "mobile"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
              title="Mobile View (375px)"
            >
              📱 <span className="hidden md:inline">Mobile</span>
            </button>
          </div>

          {/* Interaction Mode: Edit (Select) vs Live Test */}
          <div className="hidden lg:flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setInteractionMode("edit")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                interactionMode === "edit"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
              title="Edit Mode: Clicking inside preview selects section inspector"
            >
              ✏ Edit Mode
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode("interact")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                interactionMode === "interact"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
              title="Test Store: Live links and carts operate normally"
            >
              👆 Live Test
            </button>
          </div>

          {/* Canvas Outliner Toggle */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setPreviewTab("interactive")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                previewTab === "interactive"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("outliner")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                previewTab === "outliner"
                  ? "bg-white text-ink shadow-2xs"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Outliner
            </button>
          </div>
        </div>

        {/* Right Section: Governance, History & Publishing */}
        <div className="flex items-center gap-2">
          <span className="hidden xl:inline-block rounded-full bg-surface px-2 py-0.5 text-[11px] font-mono text-ink2 border border-line">
            Draft v{activeVersionNumber}
          </span>

          {isDirty && (
            <span className="hidden sm:inline-block rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 animate-pulse">
              ● Unsaved
            </span>
          )}

          {statusMessage && (
            <span className="text-[12px] text-emerald-600 font-medium">
              {statusMessage}
            </span>
          )}
          {error && <span className="text-[12px] text-rose-600">{error}</span>}

          <button
            type="button"
            onClick={() => window.open(getExternalStorefrontUrl(activeStoreSlug), "_blank")}
            className="hidden sm:flex h-8 items-center rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
            title={`Open ${activeStoreSlug} in new browser tab`}
          >
            ↗ Preview Tab
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="h-8 rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
          >
            Presets
          </button>

          <button
            type="button"
            onClick={handleOpenHistory}
            className="hidden sm:block h-8 rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
          >
            Rollback
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className={`h-8 rounded-md border px-3 text-[12px] font-medium transition disabled:opacity-50 ${
              isDirty
                ? "border-ink bg-ink text-white hover:opacity-90 shadow-2xs"
                : "border-line bg-white text-ink hover:bg-slate-50 shadow-2xs"
            }`}
          >
            {saving ? "Saving..." : isDirty ? "Save Draft *" : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="h-8 rounded-md bg-ink px-3 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50 shadow-2xs"
          >
            {publishing ? "Publishing..." : "Publish Live"}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3-PANE STUDIO CANVAS                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* --------------------------------------------------------------------- */}
        {/* PANE 1: Left - Granular Sections & Sub-Blocks Outline (290px)         */}
        {/* --------------------------------------------------------------------- */}
        <div className="flex w-[290px] shrink-0 flex-col border-r border-line bg-paper select-none">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5 bg-paper">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink2">
                Sections ({sections.length})
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => openAddSectionAtIndex(null, e)}
              className="flex items-center gap-1 rounded bg-ink px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-90 shadow-2xs"
            >
              + Add Section
            </button>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((section, idx) => {
              const isSelected = section.id === selectedSectionId;
              const hasBlocks = Boolean(section.settings?.blocks && section.settings.blocks.length > 0);
              const isBlocksExpanded = Boolean(expandedSections[section.id]);
              const sectionTitle = section.settings?.title || section.type.replace(/_/g, " ");
              const isDragged = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div key={section.id} className="space-y-0.5">
                  {/* Inline Add Section Divider (Hover between sections) */}
                  <div className="group/divider relative h-2.5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute inset-x-0 h-[1px] bg-line group-hover/divider:bg-ink/30" />
                    <button
                      type="button"
                      onClick={(e) => openAddSectionAtIndex(idx, e)}
                      className="relative z-10 rounded-full border border-line bg-white px-2 py-0.5 text-[9px] font-medium text-ink2 hover:text-ink hover:border-ink shadow-2xs transition"
                      title="Insert section here"
                    >
                      + Insert section
                    </button>
                  </div>

                  {/* Section Item Card with HTML5 Drag & Drop */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => selectSectionAndScroll(section.id)}
                    className={`group relative flex items-center justify-between rounded-lg border px-2.5 py-2 transition cursor-pointer ${
                      isSelected
                        ? "border-ink bg-surface text-ink font-medium shadow-2xs ring-1 ring-ink/20"
                        : "border-line bg-paper text-ink2 hover:border-ink/40 hover:text-ink hover:bg-slate-50/50"
                    } ${!section.enabled ? "opacity-60 bg-slate-50/70" : ""} ${
                      isDragged ? "opacity-40 border-dashed border-ink" : ""
                    } ${isDragOver ? "ring-2 ring-blue-500 bg-blue-50/20" : ""}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-1">
                      {/* Subtle 6-Dot Grip (Drag & Drop) */}
                      <span
                        className="text-ink2/40 group-hover:text-ink2 cursor-grab active:cursor-grabbing text-[11px] shrink-0"
                        title="Drag to reorder"
                      >
                        ⋮⋮
                      </span>

                      {/* Section Type Icon */}
                      <span className="shrink-0 text-ink2 group-hover:text-ink">
                        {SECTION_ICONS[section.type]}
                      </span>

                      {/* Section Title with Tooltip for Cyrillic / long text */}
                      <div className="truncate min-w-0" title={sectionTitle}>
                        <p className="truncate text-[12.5px] text-ink font-medium leading-tight">
                          {sectionTitle}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-ink2 leading-tight">
                          {section.type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>

                    {/* Quick Section Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Blocks expand arrow if section has child blocks */}
                      {hasBlocks && (
                        <button
                          type="button"
                          onClick={(e) => toggleSectionBlocksExpand(section.id, e)}
                          className="h-5 w-5 flex items-center justify-center rounded text-ink2 hover:text-ink hover:bg-surface text-[10px]"
                          title={isBlocksExpanded ? "Collapse blocks" : "Expand blocks"}
                        >
                          {isBlocksExpanded ? "▼" : "▶"}
                        </button>
                      )}

                      {/* Reorder Up / Down */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface text-[9px] text-ink2 hover:text-ink disabled:opacity-20"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(idx, "down");
                        }}
                        disabled={idx === sections.length - 1}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface text-[9px] text-ink2 hover:text-ink disabled:opacity-20"
                        title="Move Down"
                      >
                        ▼
                      </button>

                      {/* Duplicate Section */}
                      <button
                        type="button"
                        onClick={(e) => duplicateSection(section.id, e)}
                        className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded hover:bg-surface text-[11px] text-ink2 hover:text-ink"
                        title="Duplicate section"
                      >
                        ⧉
                      </button>

                      {/* Visibility Toggle Eye */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionEnabled(section.id);
                        }}
                        className={`h-5 w-5 flex items-center justify-center rounded transition ${
                          section.enabled
                            ? "text-ink hover:bg-surface"
                            : "text-ink2/50 hover:bg-surface"
                        }`}
                        title={section.enabled ? "Hide section (click to toggle)" : "Show section"}
                      >
                        {section.enabled ? "👁" : "👁‍🗨"}
                      </button>
                    </div>
                  </div>

                  {/* Child Blocks Tree (if expanded) */}
                  {hasBlocks && isBlocksExpanded && (
                    <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-line ml-3">
                      {section.settings.blocks?.map((block, bIdx) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between rounded border border-line bg-surface/40 px-2 py-1 text-[11px] text-ink hover:bg-surface cursor-pointer"
                        >
                          <span className="truncate" title={block.title}>
                            ↳ {block.title || `Block #${bIdx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(block.id);
                            }}
                            className="text-ink2 hover:text-rose-600 text-[10px]"
                            title="Remove block"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSectionId(section.id);
                          addBlockToSelected();
                        }}
                        className="w-full text-left text-[10px] text-ink2 hover:text-ink py-0.5 px-2 font-medium"
                      >
                        + Add child block
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {sections.length === 0 && !loading && (
              <div className="py-12 text-center text-[12px] text-ink2">
                No sections configured yet.<br />
                Click <span className="font-semibold text-ink">+ Add Section</span> above.
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PANE 2: Center - Responsive Live Canvas Frame                         */}
        {/* --------------------------------------------------------------------- */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-100/70">
          {previewTab === "interactive" ? (
            <div className="flex flex-1 items-center justify-center overflow-y-auto p-4 md:p-6">
              {viewMode === "desktop" ? (
                /* Desktop 1280px Frame */
                <div className="h-full w-full max-w-[1280px] rounded-lg border border-line bg-white overflow-hidden shadow-sm flex flex-col transition-all duration-300">
                  <div className="flex h-7 items-center justify-between border-b border-line bg-slate-50 px-3 text-[11px] text-ink2 select-none">
                    <span className="flex items-center gap-1.5 font-mono">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      https://{activeStoreSlug}.sheakh.qzz.io
                    </span>
                    <button
                      type="button"
                      onClick={() => setIframeKey((k) => k + 1)}
                      className="hover:text-ink text-[11px] transition"
                      title="Reload preview canvas"
                    >
                      Reload ↻
                    </button>
                  </div>
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getStudioCanvasPreviewUrl(activeStoreSlug, iframeKey)}
                    className="h-full w-full border-0 bg-white"
                    title="Storefront Desktop Preview"
                  />
                </div>
              ) : viewMode === "tablet" ? (
                /* Tablet 768px Frame */
                <div className="my-auto h-[900px] w-[768px] shrink-0 rounded-[24px] border-[10px] border-[#1e1e24] bg-white overflow-hidden shadow-xl relative flex flex-col transition-all duration-300">
                  <div className="h-6 bg-[#1e1e24] flex items-center justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-white/20" />
                  </div>
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getStudioCanvasPreviewUrl(activeStoreSlug, iframeKey)}
                    className="h-full w-full border-0 bg-white"
                    title="Storefront Tablet Preview"
                  />
                </div>
              ) : (
                /* Mobile 375px Device Bezel Frame */
                <div className="my-auto h-[780px] w-[375px] shrink-0 rounded-[40px] border-[10px] border-[#1e1e24] bg-white overflow-hidden shadow-xl relative flex flex-col transition-all duration-300">
                  {/* Dynamic Island / Bezel Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 rounded-full bg-[#1e1e24] z-20 pointer-events-none" />
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getStudioCanvasPreviewUrl(activeStoreSlug, iframeKey)}
                    className="h-full w-full border-0 bg-white pt-3"
                    title="Storefront Mobile Preview"
                  />
                </div>
              )}
            </div>
          ) : (
            /* DOM Structural Outliner View (Webflow-Style Hierarchy Tree) */
            <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
              <div className="w-full max-w-3xl rounded-lg border border-line bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-line pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">
                      Storefront Structural Outliner
                    </h3>
                    <p className="text-[12px] text-ink2">
                      DOM tree representation of page layout, columns, and data sources.
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-mono text-ink2">
                    {sections.length} DOM Root Sections
                  </span>
                </div>

                <div className="divide-y divide-line border border-line rounded-lg overflow-hidden">
                  {sections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        setPreviewTab("interactive");
                      }}
                      className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-ink2">#{idx + 1}</span>
                        <span>{SECTION_ICONS[sec.type]}</span>
                        <div>
                          <p className="text-[13px] font-semibold text-ink">
                            {sec.settings?.title || sec.type.replace(/_/g, " ")}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-ink2 mt-0.5">
                            <span className="rounded bg-surface px-1.5 py-0.5 border border-line font-mono text-[10px]">
                              {sec.type}
                            </span>
                            {sec.settings?.columns && (
                              <span>• {sec.settings.columns} Column Layout</span>
                            )}
                            {sec.dataSource?.type && (
                              <span>• Source: {sec.dataSource.type}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            sec.enabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-line"
                          }`}
                        >
                          {sec.enabled ? "Active" : "Disabled"}
                        </span>
                        <span className="text-[12px] text-ink2">Edit →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PANE 3: Right - Section Inspector with Collapsible Accordions (360px)  */}
        {/* --------------------------------------------------------------------- */}
        <div className="flex w-[360px] shrink-0 flex-col border-l border-line bg-paper select-none">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 bg-paper">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink2">
              Section Customization
            </span>
            {selectedSection && (
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-mono text-ink2 border border-line">
                {selectedSection.type.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {selectedSection ? (
            <div className="custom-scrollbar flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* ACCORDION 0: CUSTOM CODE & TAILWIND CSS */}
              {(selectedSection.type === "CUSTOM_HTML" ||
                selectedSection.type === "CUSTOM_CODE" ||
                selectedSection.settings?.customHtml !== undefined) && (
                <div className="rounded-lg border-2 border-indigo-200 bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("customCode")}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-indigo-950 bg-indigo-50/70 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white text-[11px] font-mono">
                        &lt;/&gt;
                      </span>
                      <span>Custom HTML, Tailwind &amp; React Component</span>
                    </span>
                    <span>{openAccordions.customCode ? "−" : "+"}</span>
                  </button>

                  {openAccordions.customCode && (
                    <div className="p-3.5 space-y-3.5 border-t border-indigo-100 bg-white">
                      {/* Starter Presets Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-semibold text-ink">
                            Quick Starter Templates
                          </label>
                          <span className="text-[10px] text-ink2">Click to load preset</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(SNIPPET_PRESETS).map(([key, item]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                updateSettings("customHtml", item.html);
                                if (item.css) updateSettings("customCss", item.css);
                                if (item.js) updateSettings("customJs", item.js);
                              }}
                              className="rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink hover:border-indigo-500 hover:text-indigo-600 transition shadow-2xs"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Code Mode Tabs: HTML + Tailwind vs Scoped CSS vs Client JS */}
                      <div>
                        <div className="flex rounded-md border border-line bg-slate-100 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => setActiveCodeTab("html")}
                            className={`flex-1 py-1 text-center rounded transition ${
                              activeCodeTab === "html"
                                ? "bg-white text-ink font-semibold shadow-2xs"
                                : "text-ink2 hover:text-ink"
                            }`}
                          >
                            HTML &amp; Tailwind
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCodeTab("css")}
                            className={`flex-1 py-1 text-center rounded transition ${
                              activeCodeTab === "css"
                                ? "bg-white text-ink font-semibold shadow-2xs"
                                : "text-ink2 hover:text-ink"
                            }`}
                          >
                            Custom CSS
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCodeTab("js")}
                            className={`flex-1 py-1 text-center rounded transition ${
                              activeCodeTab === "js"
                                ? "bg-white text-ink font-semibold shadow-2xs"
                                : "text-ink2 hover:text-ink"
                            }`}
                          >
                            Client JS / React
                          </button>
                        </div>
                      </div>

                      {/* Editor Sub-view 1: HTML & Tailwind CSS */}
                      {activeCodeTab === "html" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-ink2">
                              HTML Markup with Tailwind CSS Classes
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowFullscreenCodeEditor(true)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                title="Expand fullscreen"
                              >
                                <span>⛶ Fullscreen</span>
                              </button>
                              <span className="text-[10px] text-indigo-600 font-mono">
                                Tailwind JIT
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-inner">
                            <textarea
                              rows={14}
                              value={selectedSection.settings?.customHtml || ""}
                              onChange={(e) => updateSettings("customHtml", e.target.value)}
                              onKeyDown={(e) => handleCodeKeyDown(e, "customHtml")}
                              placeholder={`<div class="p-8 bg-indigo-600 text-white rounded-2xl shadow-xl">\n  <h2 class="text-3xl font-bold">Your Title</h2>\n  <p class="mt-2 text-indigo-100">Styled directly with Tailwind classes.</p>\n</div>`}
                              spellCheck={false}
                              className="w-full bg-transparent font-mono text-[12px] leading-relaxed text-slate-100 placeholder-slate-500 outline-none resize-y"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-ink2">
                            <span>💡 Press <code className="text-indigo-600 bg-indigo-50 px-1 rounded font-mono">Tab</code> to indent (2 spaces).</span>
                            <span className="font-mono text-[10px]">
                              {(selectedSection.settings?.customHtml || "").length} chars
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Editor Sub-view 2: Scoped Custom CSS */}
                      {activeCodeTab === "css" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-ink2">
                              Scoped CSS / Keyframe Animations
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowFullscreenCodeEditor(true)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                                title="Expand fullscreen"
                              >
                                <span>⛶ Fullscreen</span>
                              </button>
                              <span className="text-[10px] text-emerald-600 font-mono">
                                Auto-Scoped
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-inner">
                            <textarea
                              rows={12}
                              value={selectedSection.settings?.customCss || ""}
                              onChange={(e) => updateSettings("customCss", e.target.value)}
                              onKeyDown={(e) => handleCodeKeyDown(e, "customCss")}
                              placeholder={`/* Scoped styles applied to this section */\n.custom-section-content {\n  animation: fadeIn 0.4s ease-in-out;\n}`}
                              spellCheck={false}
                              className="w-full bg-transparent font-mono text-[12px] leading-relaxed text-slate-100 placeholder-slate-500 outline-none resize-y"
                            />
                          </div>
                          <p className="text-[11px] text-ink2 leading-relaxed">
                            🛡️ Rules are automatically scoped to this section to prevent style bleeding into global navigation or cart.
                          </p>
                        </div>
                      )}

                      {/* Editor Sub-view 3: Client Script / React Logic */}
                      {activeCodeTab === "js" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-ink2">
                              Interactive Client-side JavaScript / Micro-App
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowFullscreenCodeEditor(true)}
                                className="text-[10px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                                title="Expand fullscreen"
                              >
                                <span>⛶ Fullscreen</span>
                              </button>
                              <span className="text-[10px] text-amber-600 font-mono">
                                Scoped Runner
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-inner">
                            <textarea
                              rows={12}
                              value={selectedSection.settings?.customJs || ""}
                              onChange={(e) => updateSettings("customJs", e.target.value)}
                              onKeyDown={(e) => handleCodeKeyDown(e, "customJs")}
                              placeholder={`// container: HTMLElement, React: React, section: StorefrontSectionData\nconst btn = container.querySelector('button');\nif (btn) {\n  btn.onclick = () => alert('Clicked!');\n}`}
                              spellCheck={false}
                              className="w-full bg-transparent font-mono text-[12px] leading-relaxed text-slate-100 placeholder-slate-500 outline-none resize-y"
                            />
                          </div>
                          <p className="text-[11px] text-ink2 leading-relaxed">
                            ⚡ Scripts receive <code className="text-amber-700 bg-amber-50 px-1 rounded font-mono">container</code>, <code className="text-amber-700 bg-amber-50 px-1 rounded font-mono">React</code>, and React standard hooks and run in an error boundary.
                          </p>
                        </div>
                      )}

                      {/* Container Max Width */}
                      <div className="border-t border-line pt-3 space-y-2">
                        <label className="block text-[11px] font-medium text-ink2">
                          Container Constraint &amp; Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => updateSettings("containerMaxWidth", "contained")}
                            className={`py-1.5 text-center rounded border text-[11px] font-medium transition ${
                              (selectedSection.settings?.containerMaxWidth || "contained") === "contained"
                                ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                                : "border-line bg-white text-ink hover:bg-slate-50"
                            }`}
                          >
                            Contained (1280px)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSettings("containerMaxWidth", "narrow")}
                            className={`py-1.5 text-center rounded border text-[11px] font-medium transition ${
                              selectedSection.settings?.containerMaxWidth === "narrow"
                                ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                                : "border-line bg-white text-ink hover:bg-slate-50"
                            }`}
                          >
                            Narrow (896px)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSettings("containerMaxWidth", "full_bleed")}
                            className={`py-1.5 text-center rounded border text-[11px] font-medium transition ${
                              selectedSection.settings?.containerMaxWidth === "full_bleed"
                                ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                                : "border-line bg-white text-ink hover:bg-slate-50"
                            }`}
                          >
                            Full Bleed (100%)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACCORDION 1: TYPOGRAPHY & HEADINGS */}
              <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("typography")}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                >
                  <span>Typography &amp; Headings</span>
                  <span>{openAccordions.typography ? "−" : "+"}</span>
                </button>

                {openAccordions.typography && (
                  <div className="p-3.5 space-y-3 border-t border-line">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Eyebrow / Category Tagline
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.eyebrow || ""}
                        onChange={(e) => updateSettings("eyebrow", e.target.value)}
                        placeholder="e.g. CURATED COLLECTION"
                        className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-ink2">
                          Section Heading Title
                        </label>
                        <span
                          className="flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100"
                          title="Ready for dynamic metafield / data-source binding"
                        >
                          ⚡ Dynamic Source
                        </span>
                      </div>
                      <input
                        type="text"
                        value={selectedSection.settings?.title || ""}
                        onChange={(e) => updateSettings("title", e.target.value)}
                        placeholder="e.g. Recommended Collection"
                        className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Subtitle / Supporting Copy
                      </label>
                      <textarea
                        rows={2}
                        value={selectedSection.settings?.subtitle || ""}
                        onChange={(e) => updateSettings("subtitle", e.target.value)}
                        placeholder="e.g. Handpicked weekly specials with official warranty"
                        className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Text Alignment
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSettings("alignment", "left")}
                          className={`rounded-md border py-1 text-[11px] font-medium transition ${
                            selectedSection.settings?.alignment !== "center"
                              ? "border-ink bg-ink text-white"
                              : "border-line bg-paper text-ink"
                          }`}
                        >
                          Left Aligned
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSettings("alignment", "center")}
                          className={`rounded-md border py-1 text-[11px] font-medium transition ${
                            selectedSection.settings?.alignment === "center"
                              ? "border-ink bg-ink text-white"
                              : "border-line bg-paper text-ink"
                          }`}
                        >
                          Centered
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: HERO SPECIFIC LAYOUT CONTROLS */}
              {selectedSection.type === "HERO_SHOWCASE" && (
                <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("layout")}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                  >
                    <span>Hero Layout Model</span>
                    <span>{openAccordions.layout ? "−" : "+"}</span>
                  </button>

                  {openAccordions.layout && (
                    <div className="p-3.5 space-y-3 border-t border-line">
                      <div>
                        <label className="block text-[11px] font-medium text-ink2 mb-1">
                          Hero Architecture
                        </label>
                        <select
                          value={selectedSection.settings?.layout || "centered"}
                          onChange={(e) => updateSettings("layout", e.target.value)}
                          className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                        >
                          <option value="interactive">Signature Interactive Showcase (3-Card Multi-Pin)</option>
                          <option value="centered">Centered Editorial Headline</option>
                          <option value="split">Split Layout (Text Left, Image Right)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Secondary CTA Text
                          </label>
                          <input
                            type="text"
                            value={selectedSection.settings?.secondaryCtaText || ""}
                            onChange={(e) => updateSettings("secondaryCtaText", e.target.value)}
                            placeholder="e.g. Special Deals"
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Secondary CTA Link
                          </label>
                          <input
                            type="text"
                            value={selectedSection.settings?.secondaryCtaUrl || "/products?sale=true"}
                            onChange={(e) => updateSettings("secondaryCtaUrl", e.target.value)}
                            placeholder="/products?sale=true"
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACCORDION 3: DATA SOURCE & CATALOG RULES */}
              {(selectedSection.type === "PRODUCT_GRID" ||
                selectedSection.type === "PRODUCT_CAROUSEL" ||
                selectedSection.type === "FLASH_SALE" ||
                selectedSection.type === "CATEGORY_GRID") && (
                <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("datasource")}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                  >
                    <span>Data Source &amp; Catalog Rules</span>
                    <span>{openAccordions.datasource ? "−" : "+"}</span>
                  </button>

                  {openAccordions.datasource && (
                    <div className="p-3.5 space-y-3 border-t border-line">
                      {selectedSection.type !== "CATEGORY_GRID" && (
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Product Population Rule
                          </label>
                          <select
                            value={selectedSection.dataSource?.type || "COLLECTION"}
                            onChange={(e) => updateDataSource("type", e.target.value)}
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          >
                            <option value="COLLECTION">Dynamic Collection (Rule-based)</option>
                            <option value="LATEST_PRODUCTS">Latest Catalog Arrivals</option>
                            <option value="BEST_SELLERS">Best Sellers / Top Ranked</option>
                            <option value="FLASH_SALE">Active Flash Sale Discounts</option>
                            <option value="MANUAL_SELECTION">Manual Selection</option>
                          </select>
                        </div>
                      )}

                      {selectedSection.dataSource?.type === "COLLECTION" && (
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Select Collection
                          </label>
                          <select
                            value={selectedSection.dataSource?.collectionId || ""}
                            onChange={(e) => updateDataSource("collectionId", e.target.value)}
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          >
                            <option value="">-- All Products / Default --</option>
                            {collections.map((col) => (
                              <option key={col.id} value={col.id}>
                                {col.name} ({col.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedSection.type === "CATEGORY_GRID" && (
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Category Display Style
                          </label>
                          <select
                            value={selectedSection.settings?.layoutStyle || "tiles"}
                            onChange={(e) => updateSettings("layoutStyle", e.target.value)}
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          >
                            <option value="tiles">Bordered Image Tiles</option>
                            <option value="pills">Pill Filter Chips</option>
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Grid Columns
                          </label>
                          <select
                            value={selectedSection.settings?.columns || 4}
                            onChange={(e) => updateSettings("columns", Number(e.target.value))}
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          >
                            <option value={2}>2 Columns</option>
                            <option value={3}>3 Columns</option>
                            <option value={4}>4 Columns</option>
                            <option value={5}>5 Columns</option>
                            <option value={6}>6 Columns</option>
                            <option value={8}>8 Columns</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Max Items
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={36}
                            value={selectedSection.settings?.productLimit || 8}
                            onChange={(e) => updateSettings("productLimit", Number(e.target.value))}
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink">
                          <input
                            type="checkbox"
                            checked={selectedSection.settings?.showDiscountBadge !== false}
                            onChange={(e) => updateSettings("showDiscountBadge", e.target.checked)}
                            className="rounded border-line"
                          />
                          Show discount chip badge (−XX%)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink">
                          <input
                            type="checkbox"
                            checked={selectedSection.settings?.showViewAll !== false}
                            onChange={(e) => updateSettings("showViewAll", e.target.checked)}
                            className="rounded border-line"
                          />
                          Show &quot;View all&quot; link
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink">
                          <input
                            type="checkbox"
                            checked={selectedSection.settings?.hideWhenEmpty !== false}
                            onChange={(e) => updateSettings("hideWhenEmpty", e.target.checked)}
                            className="rounded border-line"
                          />
                          Hide section if 0 products found
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACCORDION 4: SPECIALTY SECTION FIELDS */}
              {(selectedSection.type === "BRAND_SHOWCASE" ||
                selectedSection.type === "FLASH_SALE" ||
                selectedSection.type === "TEXT_WITH_IMAGE" ||
                selectedSection.type === "PRODUCT_REQUEST_BANNER" ||
                selectedSection.type === "FEEDBACK_BANNER") && (
                <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("specialty")}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                  >
                    <span>Specialty Section Controls</span>
                    <span>{openAccordions.specialty ? "−" : "+"}</span>
                  </button>

                  {openAccordions.specialty && (
                    <div className="p-3.5 space-y-3 border-t border-line">
                      {selectedSection.type === "BRAND_SHOWCASE" && (
                        <div>
                          <label className="block text-[11px] font-medium text-ink2 mb-1">
                            Brand Names (Comma-separated)
                          </label>
                          <textarea
                            rows={3}
                            value={selectedSection.settings?.brandNames || "Apple, Samsung, Sony, Anker, Baseus, Xiaomi"}
                            onChange={(e) => updateSettings("brandNames", e.target.value)}
                            placeholder="Apple, Samsung, Sony, Baseus"
                            className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                      )}

                      {selectedSection.type === "FLASH_SALE" && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Urgency Promo Badge
                            </label>
                            <input
                              type="text"
                              value={selectedSection.settings?.promoBadge || "FLASH DEAL"}
                              onChange={(e) => updateSettings("promoBadge", e.target.value)}
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Discount Highlight Callout
                            </label>
                            <input
                              type="text"
                              value={selectedSection.settings?.discountHighlight || "Save up to 50% on selected items."}
                              onChange={(e) => updateSettings("discountHighlight", e.target.value)}
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {selectedSection.type === "TEXT_WITH_IMAGE" && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Editorial Story Body
                            </label>
                            <textarea
                              rows={4}
                              value={selectedSection.settings?.bodyText || ""}
                              onChange={(e) => updateSettings("bodyText", e.target.value)}
                              placeholder="Write your brand assurance story..."
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Image Position
                            </label>
                            <select
                              value={selectedSection.settings?.imagePosition || "right"}
                              onChange={(e) => updateSettings("imagePosition", e.target.value)}
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            >
                              <option value="right">Image on Right, Text on Left</option>
                              <option value="left">Image on Left, Text on Right</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {(selectedSection.type === "PRODUCT_REQUEST_BANNER" ||
                        selectedSection.type === "FEEDBACK_BANNER") && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Button Label
                            </label>
                            <input
                              type="text"
                              value={selectedSection.settings?.buttonText || "Submit"}
                              onChange={(e) => updateSettings("buttonText", e.target.value)}
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-ink2 mb-1">
                              Action Route
                            </label>
                            <input
                              type="text"
                              value={selectedSection.settings?.buttonUrl || "/feedback"}
                              onChange={(e) => updateSettings("buttonUrl", e.target.value)}
                              className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ACCORDION 5: STYLING & APPEARANCE */}
              <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("styling")}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                >
                  <span>Styling &amp; Appearance</span>
                  <span>{openAccordions.styling ? "−" : "+"}</span>
                </button>

                {openAccordions.styling && (
                  <div className="p-3.5 space-y-3 border-t border-line">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-ink2 mb-1">
                          Background Tone
                        </label>
                        <select
                          value={selectedSection.settings?.background || "paper"}
                          onChange={(e) => updateSettings("background", e.target.value)}
                          className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                        >
                          <option value="paper">Paper White</option>
                          <option value="surface">Subtle Surface</option>
                          <option value="ink">Contrast Dark</option>
                          <option value="custom">Custom Color</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink2 mb-1">
                          Spacing Density
                        </label>
                        <select
                          value={selectedSection.settings?.padding || "normal"}
                          onChange={(e) => updateSettings("padding", e.target.value)}
                          className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                        >
                          <option value="compact">Compact (py-8)</option>
                          <option value="normal">Standard (py-14)</option>
                          <option value="spacious">Spacious (py-20)</option>
                        </select>
                      </div>
                    </div>

                    {selectedSection.settings?.background === "custom" && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="color"
                          value={selectedSection.settings?.customBgColor || "#f4f4f5"}
                          onChange={(e) => updateSettings("customBgColor", e.target.value)}
                          className="h-8 w-8 rounded border border-line p-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedSection.settings?.customBgColor || "#f4f4f5"}
                          onChange={(e) => updateSettings("customBgColor", e.target.value)}
                          placeholder="#f4f4f5"
                          className="flex-1 rounded-md border border-line px-2.5 py-1 text-[12px] font-mono text-ink"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-[12px] text-ink">
                      <input
                        type="checkbox"
                        checked={selectedSection.settings?.showTopBorder !== false}
                        onChange={(e) => updateSettings("showTopBorder", e.target.checked)}
                        className="rounded border-line"
                      />
                      Show hairline top border
                    </label>
                  </div>
                )}
              </div>

              {/* ACCORDION 6: ACTIONS & MEDIA */}
              <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("media")}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                >
                  <span>Actions &amp; Media</span>
                  <span>{openAccordions.media ? "−" : "+"}</span>
                </button>

                {openAccordions.media && (
                  <div className="p-3.5 space-y-3 border-t border-line">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-ink2 mb-1">
                          Primary CTA Text
                        </label>
                        <input
                          type="text"
                          value={selectedSection.settings?.ctaText || "Shop collection"}
                          onChange={(e) => updateSettings("ctaText", e.target.value)}
                          className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-ink2 mb-1">
                          Destination URL
                        </label>
                        <input
                          type="text"
                          value={selectedSection.settings?.ctaUrl || "/products"}
                          onChange={(e) => updateSettings("ctaUrl", e.target.value)}
                          placeholder="/products"
                          className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <ImagePicker
                        label="Featured Image / Graphic"
                        hint="Display alongside headline or as visual banner."
                        value={selectedSection.settings?.imageUrl || ""}
                        onChange={(url) => updateSettings("imageUrl", url)}
                        folder="storefront/sections"
                      />
                      {selectedSection.settings?.imageUrl && (
                        <div className="mt-2 relative rounded-md border border-line overflow-hidden h-24 bg-surface flex items-center justify-center">
                          <img
                            src={selectedSection.settings.imageUrl}
                            alt="Section preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 7: GRANULAR CHILD BLOCKS */}
              <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("blocks")}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12px] font-semibold text-ink bg-slate-50/50 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-1.5">
                    Child Blocks ({(selectedSection.settings?.blocks || []).length})
                  </span>
                  <span>{openAccordions.blocks ? "−" : "+"}</span>
                </button>

                {openAccordions.blocks && (
                  <div className="p-3.5 space-y-2.5 border-t border-line">
                    {(selectedSection.settings?.blocks || []).map((block, idx) => (
                      <div
                        key={block.id}
                        className="rounded-md border border-line bg-surface/50 p-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-ink">
                            Block #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="text-[11px] text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          value={block.title}
                          onChange={(e) => updateBlock(block.id, "title", e.target.value)}
                          placeholder="Block Title / Label"
                          className="w-full rounded border border-line bg-white px-2 py-1 text-[12px] text-ink"
                        />
                        <input
                          type="text"
                          value={block.ctaUrl || ""}
                          onChange={(e) => updateBlock(block.id, "ctaUrl", e.target.value)}
                          placeholder="Link Route (e.g. /products/sofas)"
                          className="w-full rounded border border-line bg-white px-2 py-1 text-[12px] text-ink"
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addBlockToSelected}
                      className="w-full rounded-md border border-line bg-white py-1.5 text-[11px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
                    >
                      + Add New Block
                    </button>
                  </div>
                )}
              </div>

              {/* REMOVE SECTION ACTION */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => removeSection(selectedSection.id)}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50/70 py-2 text-[12px] font-medium text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                >
                  Remove Section from Page
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 text-center text-[12.5px] text-ink2">
              Select any section on the left to inspect and configure its attributes.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL THEME SETTINGS MODAL / DRAWER                                     */}
      {/* ========================================================================= */}
      {showThemeSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
          <div className="w-full max-w-lg rounded-xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Global Theme Settings</h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  Configure brand design tokens applied store-wide across all templates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowThemeSettingsModal(false)}
                className="text-[14px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {/* Brand Colors */}
              <div className="rounded-lg border border-line bg-surface/30 p-3.5 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink">
                  Brand Colors
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeTokens.primaryColor}
                        onChange={(e) =>
                          setThemeTokens((t) => ({ ...t, primaryColor: e.target.value }))
                        }
                        className="h-7 w-7 rounded border border-line p-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={themeTokens.primaryColor}
                        onChange={(e) =>
                          setThemeTokens((t) => ({ ...t, primaryColor: e.target.value }))
                        }
                        className="flex-1 rounded border border-line px-2 py-1 text-[12px] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeTokens.accentColor}
                        onChange={(e) =>
                          setThemeTokens((t) => ({ ...t, accentColor: e.target.value }))
                        }
                        className="h-7 w-7 rounded border border-line p-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={themeTokens.accentColor}
                        onChange={(e) =>
                          setThemeTokens((t) => ({ ...t, accentColor: e.target.value }))
                        }
                        className="flex-1 rounded border border-line px-2 py-1 text-[12px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Typography */}
              <div className="rounded-lg border border-line bg-surface/30 p-3.5 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink">
                  Global Typography
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Heading Font Family
                    </label>
                    <select
                      value={themeTokens.headingFont}
                      onChange={(e) =>
                        setThemeTokens((t) => ({ ...t, headingFont: e.target.value }))
                      }
                      className="w-full rounded border border-line bg-paper px-2 py-1 text-[12px]"
                    >
                      <option value="Inter">Inter (Clean Modern)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech Editorial)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Body Font Family
                    </label>
                    <select
                      value={themeTokens.bodyFont}
                      onChange={(e) =>
                        setThemeTokens((t) => ({ ...t, bodyFont: e.target.value }))
                      }
                      className="w-full rounded border border-line bg-paper px-2 py-1 text-[12px]"
                    >
                      <option value="Inter">Inter</option>
                      <option value="DM Sans">DM Sans</option>
                      <option value="System">System Sans</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Layout & Corner Radii */}
              <div className="rounded-lg border border-line bg-surface/30 p-3.5 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink">
                  Layout &amp; Shapes
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Corner Radius
                    </label>
                    <select
                      value={themeTokens.borderRadius}
                      onChange={(e) =>
                        setThemeTokens((t) => ({ ...t, borderRadius: e.target.value }))
                      }
                      className="w-full rounded border border-line bg-paper px-2 py-1 text-[12px]"
                    >
                      <option value="0px">Sharp (0px)</option>
                      <option value="8px">Modern (8px)</option>
                      <option value="16px">Soft (16px)</option>
                      <option value="9999px">Pill (Full)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Container Max Width
                    </label>
                    <select
                      value={themeTokens.containerWidth}
                      onChange={(e) =>
                        setThemeTokens((t) => ({ ...t, containerWidth: e.target.value }))
                      }
                      className="w-full rounded border border-line bg-paper px-2 py-1 text-[12px]"
                    >
                      <option value="1200px">1200px (Compact)</option>
                      <option value="1280px">1280px (Standard)</option>
                      <option value="1440px">1440px (Wide)</option>
                      <option value="100%">Full Bleed (100%)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setShowThemeSettingsModal(false)}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowThemeSettingsModal(false);
                  setStatusMessage("Theme settings applied");
                  setTimeout(() => setStatusMessage(""), 3500);
                }}
                className="rounded-md bg-ink px-4 py-1.5 text-[12px] font-medium text-white hover:opacity-90 shadow-2xs"
              >
                Apply Theme Tokens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD SECTION PALETTE MODAL                                                */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
          <div className="w-full max-w-lg rounded-xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Add Section</h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  {addSectionIndex !== null
                    ? `Inserting at position #${addSectionIndex + 1}`
                    : "Appending to page layout"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddSectionIndex(null);
                }}
                className="text-[14px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[440px] overflow-y-auto space-y-2 pr-1">
              {AVAILABLE_SECTION_TEMPLATES.map((tmpl, tIdx) => (
                <div
                  key={`${tmpl.type}-${tIdx}`}
                  onClick={() => addSection(tmpl)}
                  className="flex items-start justify-between rounded-lg border border-line p-3 transition hover:border-ink hover:bg-surface cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 pr-4">
                    <span className="mt-0.5 text-ink shrink-0">{SECTION_ICONS[tmpl.type]}</span>
                    <div>
                      <h4 className="text-[13px] font-semibold text-ink">{tmpl.label}</h4>
                      <p className="mt-0.5 text-[12px] text-ink2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-surface px-2.5 py-1 text-[11px] font-medium text-ink border border-line shrink-0">
                    Add
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATES & PRESETS MODAL                                                */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">
                  Storefront Templates &amp; Presets
                </h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  Select a pre-architected design foundation for your store.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-[14px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {/* Option 1: Signature Initial Design */}
              <div
                className={`rounded-xl border p-4 transition ${
                  hasSignatureTemplate
                    ? "border-ink/40 bg-surface/40 hover:border-ink"
                    : "border-line bg-paper opacity-85"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold text-ink">
                        Signature Interactive Showcase (Initial Design)
                      </h4>
                      {hasSignatureTemplate ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Provisioned by Platform Admin
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-ink2 border border-line">
                          Platform Admin Managed
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink2 leading-relaxed">
                      Matches the original lifestyle showroom design: 3-card layout (velvet sofa, centerpiece armchair with interactive product hotspots, slide navigation 01-03, and watermark typography), followed by Category Grid, Featured Products, Product Request, and Flash Sales.
                    </p>
                    {!hasSignatureTemplate && (
                      <p className="text-[11px] text-amber-700 font-medium pt-1">
                        🔒 Not provisioned for this store. Only stores selected by platform administrator receive this initial template.
                      </p>
                    )}
                  </div>
                  {hasSignatureTemplate ? (
                    <button
                      type="button"
                      onClick={applyInitialDesignTemplate}
                      className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90 shadow-2xs"
                    >
                      Apply Preset
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-ink2 opacity-60 cursor-not-allowed"
                    >
                      Admin Only 🔒
                    </button>
                  )}
                </div>
              </div>

              {/* Option 2: Modern Clean Retail */}
              <div className="rounded-xl border border-line bg-paper p-4 transition hover:border-ink/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-semibold text-ink">
                      Modern Clean Retail
                    </h4>
                    <p className="text-[12px] text-ink2 leading-relaxed">
                      Clean commercial storefront layout featuring split hero banner, trending product carousel, authentic trust guarantee block, and time-limited flash deals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyModernRetailTemplate}
                    className="shrink-0 rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
                  >
                    Apply Preset
                  </button>
                </div>
              </div>

              {/* Option 3: Clean Slate */}
              <div className="rounded-xl border border-line bg-paper p-4 transition hover:border-rose-400">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-semibold text-ink">
                      Blank Canvas (Custom from Zero)
                    </h4>
                    <p className="text-[12px] text-ink2 leading-relaxed">
                      Clears all sections so you can handcraft the homepage block-by-block using the section palette.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Clear all sections and start with blank canvas?")) {
                        setSections([]);
                        setSelectedSectionId(null);
                        setShowTemplateModal(false);
                      }
                    }}
                    className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                  >
                    Start Zero
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORY & ROLLBACK MODAL                                                 */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
          <div className="w-full max-w-lg rounded-xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">
                  Publication History &amp; Rollback
                </h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  Restore any previous published version snapshot with 1-click rollback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-[14px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[380px] overflow-y-auto divide-y divide-line pr-1">
              {historyList.map((hist) => (
                <div
                  key={hist.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-ink">
                        Version {hist.versionNumber}
                      </span>
                      {hist.isPublished && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          Active Live
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink2 mt-0.5">
                      {hist.changeSummary || "Snapshot"} •{" "}
                      {new Date(hist.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {!hist.isPublished && (
                    <button
                      type="button"
                      onClick={() => handleRollback(hist.versionNumber)}
                      className="rounded-md border border-line bg-white px-3 py-1 text-[11px] font-medium text-ink hover:bg-slate-50 transition shadow-2xs"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              ))}

              {historyList.length === 0 && (
                <div className="py-8 text-center text-[13px] text-ink2">
                  No published versions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN ENTERPRISE CODE EDITOR MODAL                                  */}
      {/* ========================================================================= */}
      {showFullscreenCodeEditor && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 select-none backdrop-blur-xs">
          <div className="flex h-full w-full max-w-6xl flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[12px] font-mono text-white font-bold">
                  &lt;/&gt;
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">
                    {selectedSection.settings?.title || "Custom Section"} • Code Inspector
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live changes synchronize directly to the Storefront Canvas.
                  </p>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1 text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("html")}
                  className={`px-3 py-1 rounded transition ${
                    activeCodeTab === "html"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  HTML &amp; Tailwind
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("css")}
                  className={`px-3 py-1 rounded transition ${
                    activeCodeTab === "css"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Scoped CSS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("js")}
                  className={`px-3 py-1 rounded transition ${
                    activeCodeTab === "js"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Client JS / React
                </button>
              </div>

              {/* Presets and Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullscreenCodeEditor(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  title="Close Fullscreen Editor"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Starters Row */}
            <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/40 px-6 py-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0">Insert Starter:</span>
              {Object.entries(SNIPPET_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    updateSettings("customHtml", item.html);
                    if (item.css) updateSettings("customCss", item.css);
                    if (item.js) updateSettings("customJs", item.js);
                  }}
                  className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-200 hover:border-indigo-400 hover:text-white transition shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 p-6 flex flex-col min-h-0 bg-slate-950">
              {activeCodeTab === "html" && (
                <textarea
                  value={selectedSection.settings?.customHtml || ""}
                  onChange={(e) => updateSettings("customHtml", e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(e, "customHtml")}
                  spellCheck={false}
                  placeholder="<!-- Write custom HTML with full Tailwind CSS classes -->"
                  className="flex-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-[13px] leading-relaxed text-slate-100 placeholder-slate-600 outline-none resize-none focus:border-indigo-500 shadow-inner"
                />
              )}

              {activeCodeTab === "css" && (
                <textarea
                  value={selectedSection.settings?.customCss || ""}
                  onChange={(e) => updateSettings("customCss", e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(e, "customCss")}
                  spellCheck={false}
                  placeholder="/* Scoped CSS - automatically isolated to this section */"
                  className="flex-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-[13px] leading-relaxed text-slate-100 placeholder-slate-600 outline-none resize-none focus:border-indigo-500 shadow-inner"
                />
              )}

              {activeCodeTab === "js" && (
                <textarea
                  value={selectedSection.settings?.customJs || ""}
                  onChange={(e) => updateSettings("customJs", e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(e, "customJs")}
                  spellCheck={false}
                  placeholder="// Client-side JavaScript / React logic (receives container, React, and hooks)"
                  className="flex-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-[13px] leading-relaxed text-slate-100 placeholder-slate-600 outline-none resize-none focus:border-indigo-500 shadow-inner"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-900/60 text-[11px] text-slate-400">
              <div className="flex items-center gap-4">
                <span>Tab inserts 2 spaces.</span>
                <span className="text-emerald-400">● Live preview synchronized</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullscreenCodeEditor(false)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 font-semibold text-white hover:bg-indigo-500 transition shadow-xs"
              >
                Done Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
