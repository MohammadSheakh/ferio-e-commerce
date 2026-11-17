"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import Topbar from "@/components/Topbar";
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
  return `/api/storefront/preview-render?preview=true&slug=${encodeURIComponent(storeSlug)}&v=${versionKey}`;
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
  | "TEXT_WITH_IMAGE";

type ProductSourceType =
  | "MANUAL_SELECTION"
  | "COLLECTION"
  | "LATEST_PRODUCTS"
  | "BEST_SELLERS"
  | "FLASH_SALE"
  | "ACTIVE_DISCOUNTS";

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
    layoutStyle?: "tiles" | "pills";
    background?: "paper" | "surface" | "ink";
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
];

export default function StorefrontStudioPage() {
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [historyList, setHistoryList] = useState<VersionHistoryItem[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState(1);
  const [hasSignatureTemplate, setHasSignatureTemplate] = useState(false);
  const [previewTab, setPreviewTab] = useState<"interactive" | "wireframe">("interactive");
  const [iframeKey, setIframeKey] = useState(0);
  const [activeStoreSlug, setActiveStoreSlug] = useState<string>("test");
  const initialSnapshotRef = useRef<string>("");
  const [, startTransition] = useTransition();

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

  // Reorder sections
  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const updated = copy.map((sec, idx) => ({ ...sec, sortOrder: idx }));
    setSections(updated);
  };

  // Toggle section enabled
  const toggleSectionEnabled = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  // Remove section
  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedSectionId === id) {
      const remaining = sections.filter((s) => s.id !== id);
      setSelectedSectionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Add section
  const addSection = (template: typeof AVAILABLE_SECTION_TEMPLATES[0]) => {
    const newSection: StorefrontSection = {
      id: `sec_${Date.now()}`,
      type: template.type,
      enabled: true,
      sortOrder: sections.length,
      settings: { ...template.defaultSettings },
      dataSource: template.defaultDataSource ? { ...template.defaultDataSource } : null,
      data: { items: [] },
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setShowAddModal(false);
  };

  const applyInitialDesignTemplate = () => {
    if (!hasSignatureTemplate) {
      alert(
        "This template requires platform administrator provisioning. Please contact your platform administrator to provision the full Signature Showroom template to your store.",
      );
      return;
    }
    if (
      sections.length > 0 &&
      !confirm("Re-apply the Signature Initial Design template? This will replace current sections in the working draft.")
    ) {
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
        data: {},
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
        data: {},
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
        data: { items: [] },
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
        data: {},
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
        data: {},
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
        data: { items: [] },
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
        data: { items: [] },
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
        data: { items: [] },
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
        data: { items: [] },
      },
    ];
    setSections(templateSections);
    setSelectedSectionId(templateSections[0].id);
    setShowTemplateModal(false);
  };

  const applyModernRetailTemplate = () => {
    if (
      sections.length > 0 &&
      !confirm("Apply the Modern Retail template? This will replace current sections in the working draft.")
    ) {
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
        data: {},
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
        data: {},
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
        data: { items: [] },
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
        data: {},
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
        data: { items: [] },
      },
    ];
    setSections(templateSections);
    setSelectedSectionId(templateSections[0].id);
    setShowTemplateModal(false);
  };

  const applyBlankCanvasTemplate = () => {
    if (
      sections.length > 0 &&
      !confirm("Clear all sections to customize from zero? This will clear the working draft canvas.")
    ) {
      return;
    }
    setSections([]);
    setSelectedSectionId(null);
    setShowTemplateModal(false);
  };

  // Update selected section settings
  const updateSettings = (key: string, value: any) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedSectionId
          ? { ...s, settings: { ...s.settings, [key]: value } }
          : s,
      ),
    );
  };

  // Update data source
  const updateDataSource = (key: string, value: any) => {
    if (!selectedSectionId) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedSectionId
          ? {
              ...s,
              dataSource: {
                ...(s.dataSource || { type: "LATEST_PRODUCTS" }),
                [key]: value,
              },
            }
          : s,
      ),
    );
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage("");
    setError("");
    try {
      const res = await fetch("/api/storefront/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((s, idx) => ({
            id: s.id,
            type: s.type,
            enabled: s.enabled,
            sortOrder: idx,
            settings: s.settings || {},
            dataSource: s.dataSource || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save draft");
      initialSnapshotRef.current = serializeSections(sections);
      setIframeKey((k) => k + 1);
      setStatusMessage("Draft saved successfully.");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    setStatusMessage("");
    setError("");
    try {
      await handleSaveDraft();

      const res = await fetch("/api/storefront/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeSummary: "Storefront published via Studio" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to publish storefront");

      initialSnapshotRef.current = serializeSections(sections);
      setIframeKey((k) => k + 1);
      setStatusMessage("Storefront published live!");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err: any) {
      setError(err.message || "Unable to publish storefront.");
    } finally {
      setPublishing(false);
    }
  };

  // Load history
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    try {
      const res = await fetch("/api/storefront/history");
      const data = await res.json();
      if (data.data) setHistoryList(data.data);
    } catch {
      // ignore
    }
  };

  // Rollback
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
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Topbar title="Storefront Studio" />

      {/* Action Sub-header */}
      <div className="flex h-14 items-center justify-between border-b border-line bg-paper px-6">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-ink">Homepage Layout</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink2 border border-line">
            Draft v{activeVersionNumber}
          </span>
          {isDirty && (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 animate-pulse">
              ● Unsaved changes
            </span>
          )}
          {statusMessage && (
            <span className="text-[12px] text-emerald-600 font-medium">
              {statusMessage}
            </span>
          )}
          {error && <span className="text-[12px] text-rose-600">{error}</span>}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mode Switcher: Interactive vs Wireframe */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setPreviewTab("interactive")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                previewTab === "interactive"
                  ? "bg-paper text-ink"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Live Preview
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("wireframe")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                previewTab === "wireframe"
                  ? "bg-paper text-ink"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Wireframe
            </button>
          </div>

          {/* Viewport switch */}
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                viewMode === "desktop"
                  ? "bg-paper text-ink"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                viewMode === "mobile"
                  ? "bg-paper text-ink"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.open(getExternalStorefrontUrl(activeStoreSlug), "_blank")}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-surface"
            title={`Open ${activeStoreSlug} storefront in new tab`}
          >
            Preview Tab ↗
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-surface"
          >
            Templates &amp; Presets
          </button>

          <button
            type="button"
            onClick={handleOpenHistory}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-surface"
          >
            History &amp; Rollback
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className={`rounded-full border px-4 py-1.5 text-[12px] font-medium transition disabled:opacity-50 ${
              isDirty
                ? "border-ink bg-ink text-white hover:opacity-90"
                : "border-line bg-paper text-ink hover:bg-surface"
            }`}
          >
            {saving ? "Saving..." : isDirty ? "Save Draft *" : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish Live"}
          </button>
        </div>
      </div>

      {/* 3-Pane Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANE 1: Left - Section Outline List (280px) */}
        <div className="flex w-[280px] flex-col border-r border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-ink2">
              Sections ({sections.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-85"
            >
              + Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {sections.map((section, idx) => {
              const isSelected = section.id === selectedSectionId;
              return (
                <div
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 transition cursor-pointer ${
                    isSelected
                      ? "border-ink bg-surface text-ink font-medium"
                      : "border-line bg-paper text-ink2 hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 text-[10px] text-ink2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="hover:text-ink disabled:opacity-20"
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
                        className="hover:text-ink disabled:opacity-20"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="truncate">
                      <p className="truncate text-[13px] text-ink">
                        {section.settings?.title || section.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] uppercase text-ink2">
                        {section.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSectionEnabled(section.id);
                      }}
                      className={`h-4 w-4 rounded-full border transition ${
                        section.enabled
                          ? "border-ink bg-ink"
                          : "border-line bg-paper"
                      }`}
                      title={section.enabled ? "Enabled (click to hide)" : "Hidden (click to enable)"}
                    />
                  </div>
                </div>
              );
            })}

            {sections.length === 0 && !loading && (
              <div className="py-12 text-center text-[13px] text-ink2">
                No sections configured.
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center - Live Storefront Preview */}
        <div className="flex flex-1 flex-col overflow-hidden bg-surface">
          {/* Subbar for Preview Controls */}
          <div className="flex h-11 items-center justify-between border-b border-line bg-paper px-6 text-[12px]">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-ink">
                {previewTab === "interactive"
                  ? "Interactive Live Storefront"
                  : "Wireframe Outline"}
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Draft Mode (?preview=true)
              </span>
              <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-[10px] font-medium text-ink2">
                Store: {activeStoreSlug}
              </span>
              {isDirty && previewTab === "interactive" && (
                <span className="text-[11px] text-amber-700">
                  Save draft to reflect latest edits in live preview
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-ink2">
                {viewMode === "desktop" ? "1280px Desktop View" : "390px Mobile View"}
              </span>
              {previewTab === "interactive" && (
                <button
                  type="button"
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-medium text-ink hover:bg-surface transition"
                  title="Reload preview iframe"
                >
                  Reload ↻
                </button>
              )}
            </div>
          </div>

          {previewTab === "interactive" ? (
            <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
              {viewMode === "desktop" ? (
                <div className="h-full w-full rounded-card border border-line bg-paper overflow-hidden shadow-none flex flex-col">
                  <iframe
                    key={iframeKey}
                    src={getStudioCanvasPreviewUrl(activeStoreSlug, iframeKey)}
                    className="h-full w-full border-0 bg-paper"
                    title="Storefront Desktop Preview"
                  />
                </div>
              ) : (
                <div className="my-auto h-[780px] w-[390px] shrink-0 rounded-[36px] border-[8px] border-[#1e1e24] bg-paper overflow-hidden shadow-none relative flex flex-col">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-full bg-[#1e1e24] z-20 pointer-events-none" />
                  <iframe
                    key={iframeKey}
                    src={getStudioCanvasPreviewUrl(activeStoreSlug, iframeKey)}
                    className="h-full w-full border-0 bg-paper pt-3"
                    title="Storefront Mobile Preview"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-start justify-center overflow-y-auto bg-surface p-6">
              <div
                className={`transition-all duration-300 bg-paper rounded-card border border-line overflow-hidden shadow-none ${
                  viewMode === "desktop" ? "w-full max-w-4xl" : "w-[390px]"
                }`}
              >
                {/* Storefront Header Mock */}
                <div className="border-b border-line px-5 py-3 flex items-center justify-between text-[13px] text-ink2">
                  <span className="font-semibold text-ink">Storefront Wireframe Preview</span>
                  <span className="text-[11px]">
                    {viewMode === "desktop" ? "1280px Desktop" : "390px Mobile View"}
                  </span>
                </div>

                {/* Rendered Sections */}
                <div className="divide-y divide-line min-h-[500px]">
              {sections
                .filter((s) => s.enabled)
                .map((section) => {
                  const isSelected = section.id === selectedSectionId;
                  const st = section.settings || {};
                  const isInk = st.background === "ink";
                  const isSurface = st.background === "surface";
                  const bgClass = isInk
                    ? "bg-[#111114] text-white"
                    : isSurface
                      ? "bg-surface text-ink"
                      : "bg-paper text-ink";

                  return (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      className={`p-6 transition cursor-pointer relative ${bgClass} ${
                        isSelected
                          ? "ring-2 ring-ink ring-inset"
                          : "hover:opacity-95"
                      }`}
                    >
                      {/* Section Heading & View All in Preview */}
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          {st.eyebrow && (
                            <span
                              className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                                isInk ? "text-white/70" : "text-ink2"
                              }`}
                            >
                              {st.eyebrow}
                            </span>
                          )}
                          <h3
                            className={`text-[17px] font-semibold tracking-tight ${
                              isInk ? "text-white" : "text-ink"
                            }`}
                          >
                            {st.title || section.type.replace(/_/g, " ")}
                          </h3>
                          {st.subtitle && (
                            <p
                              className={`text-[12px] mt-0.5 ${
                                isInk ? "text-white/60" : "text-ink2"
                              }`}
                            >
                              {st.subtitle}
                            </p>
                          )}
                        </div>
                        {st.showViewAll && (
                          <span
                            className={`text-[11px] ${
                              isInk ? "text-white/80" : "text-ink2"
                            }`}
                          >
                            {st.viewAllText || "View all →"}
                          </span>
                        )}
                      </div>

                      {/* HERO SHOWCASE PREVIEW */}
                      {section.type === "HERO_SHOWCASE" ? (
                        st.layout === "interactive" || st.variant === "interactive" ? (
                          <div className="rounded-card border border-line bg-surface/40 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-ink2">
                                Signature Interactive 3-Card Showcase
                              </span>
                              <span className="text-[11px] font-medium text-ink2">
                                Slide 01 / 03
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-3 min-h-[180px]">
                              <div className="col-span-4 rounded-xl border border-line bg-paper p-3 flex flex-col justify-between">
                                <div className="h-24 rounded-lg bg-surface/70 border border-line flex items-center justify-center text-[11px] text-ink2 font-medium">
                                  Lifestyle Scene 1
                                </div>
                                <div className="mt-2">
                                  <div className="text-[11px] font-semibold text-ink truncate">Velvet Sofa</div>
                                  <div className="text-[10px] text-ink2">Interactive Pin</div>
                                </div>
                              </div>
                              <div className="col-span-5 rounded-xl border-2 border-ink bg-paper p-3 flex flex-col justify-between shadow-sm">
                                <div className="h-24 rounded-lg bg-surface border border-line flex items-center justify-center text-[11px] text-ink font-medium relative">
                                  Hero Focal Centerpiece
                                  <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                  </span>
                                </div>
                                <div className="mt-2">
                                  <div className="text-[12px] font-bold text-ink truncate">
                                    {st.title || "Modern Living"}
                                  </div>
                                  <div className="text-[10px] text-ink2 truncate">
                                    {st.subtitle || "Curated Interior Design"}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-3 rounded-xl border border-line bg-paper p-3 flex flex-col justify-between">
                                <div className="h-24 rounded-lg bg-surface/70 border border-line flex items-center justify-center text-[11px] text-ink2 font-medium">
                                  Scene 3
                                </div>
                                <div className="mt-2">
                                  <div className="text-[11px] font-medium text-ink truncate">Armchair</div>
                                  <div className="text-[10px] text-ink2">Interactive Pin</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`rounded-card border p-8 text-center flex flex-col items-center justify-center ${
                              isInk
                                ? "border-white/10 bg-white/5 text-white"
                                : "border-line bg-surface/60 text-ink"
                            }`}
                          >
                            {st.eyebrow && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-2 border ${
                                  isInk
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-line bg-paper text-ink2"
                                }`}
                              >
                                {st.eyebrow}
                              </span>
                            )}
                            <h2 className="text-[22px] font-semibold tracking-tight max-w-md">
                              {st.title || "From our shelf to your doorstep."}
                            </h2>
                            <p
                              className={`mt-1.5 text-[13px] max-w-sm ${
                                isInk ? "text-white/70" : "text-ink2"
                              }`}
                            >
                              {st.subtitle ||
                                "Handpicked products nationwide Bangladesh."}
                            </p>
                            <div className="mt-5 flex items-center gap-2.5">
                              <span
                                className={`rounded-full px-5 py-2 text-[12px] font-medium ${
                                  isInk
                                    ? "bg-white text-ink"
                                    : "bg-ink text-white"
                                }`}
                              >
                                {st.ctaText || "Shop collection"}
                              </span>
                              {st.secondaryCtaText && (
                                <span
                                  className={`rounded-full border px-4 py-2 text-[12px] font-medium ${
                                    isInk
                                      ? "border-white/30 text-white"
                                      : "border-line bg-paper text-ink"
                                  }`}
                                >
                                  {st.secondaryCtaText}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      ) : section.type === "CATEGORY_GRID" ? (
                        <div>
                          {st.layoutStyle === "pills" ? (
                            <div className="flex flex-wrap gap-2">
                              {(section.data?.categories?.length
                                ? section.data.categories
                                : [
                                    { id: "1", name: "Smartphones" },
                                    { id: "2", name: "Laptops" },
                                    { id: "3", name: "Audio & Sound" },
                                    { id: "4", name: "Accessories" },
                                    { id: "5", name: "Wearables" },
                                  ]
                              ).map((cat: any) => (
                                <span
                                  key={cat.id}
                                  className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12px] font-medium text-ink"
                                >
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={`grid gap-2 ${
                                st.columns === 6
                                  ? "grid-cols-3 sm:grid-cols-6"
                                  : st.columns === 4
                                    ? "grid-cols-2 sm:grid-cols-4"
                                    : "grid-cols-2 sm:grid-cols-5"
                              }`}
                            >
                              {(section.data?.categories?.length
                                ? section.data.categories
                                : [
                                    { id: "1", name: "Smartphones" },
                                    { id: "2", name: "Laptops" },
                                    { id: "3", name: "Audio" },
                                    { id: "4", name: "Accessories" },
                                    { id: "5", name: "Wearables" },
                                  ]
                              ).map((cat: any) => (
                                <div
                                  key={cat.id}
                                  className="rounded-card border border-line bg-surface/40 px-3 py-4 text-center text-[12px] font-medium text-ink"
                                >
                                  {cat.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : section.type === "BRAND_SHOWCASE" ? (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {(st.brandNames
                            ? st.brandNames.split(",").map((s: string) => s.trim())
                            : ["Apple", "Samsung", "Sony", "Anker", "Baseus", "Xiaomi"]
                          ).map((brand: string) => (
                            <div
                              key={brand}
                              className="rounded-card border border-line bg-surface/30 px-3 py-3 text-center text-[12px] font-semibold text-ink"
                            >
                              {brand}
                            </div>
                          ))}
                        </div>
                      ) : section.type === "TEXT_WITH_IMAGE" ? (
                        <div className="rounded-card border border-line bg-surface/30 p-6 flex items-center justify-between gap-6">
                          <div>
                            <h4 className="text-[15px] font-semibold text-ink">
                              {st.title || "Crafted for durability & authenticity"}
                            </h4>
                            <p className="mt-1 text-[12px] text-ink2 max-w-md">
                              {st.bodyText ||
                                "Every item in our collection is rigorously verified for authenticity with authorized distributor partnerships."}
                            </p>
                            <span className="mt-3 inline-block rounded-full bg-ink px-4 py-1.5 text-[11px] font-medium text-white">
                              {st.ctaText || "Learn our standards"}
                            </span>
                          </div>
                          <div className="h-20 w-28 shrink-0 rounded-card border border-line bg-paper flex items-center justify-center text-[10px] text-ink2">
                            Image
                          </div>
                        </div>
                      ) : section.type === "PRODUCT_REQUEST_BANNER" ? (
                        <div className="rounded-card border border-line bg-surface p-6 flex items-center justify-between">
                          <div>
                            <h4 className="text-[14px] font-medium text-ink">
                              {st.title || "Looking for something specific?"}
                            </h4>
                            <p className="text-[12px] text-ink2">
                              {st.subtitle ||
                                "Let us know what you need and we will source it for you."}
                            </p>
                          </div>
                          <span className="rounded-full border border-line bg-paper px-4 py-1.5 text-[12px] font-medium text-ink">
                            {st.buttonText || "Request product"}
                          </span>
                        </div>
                      ) : section.type === "FEEDBACK_BANNER" ? (
                        <div className="rounded-card border border-line bg-surface p-6 flex items-center justify-between">
                          <div>
                            <h4 className="text-[14px] font-medium text-ink">
                              {st.title || "Suggestions & Wishes"}
                            </h4>
                            <p className="text-[12px] text-ink2">
                              {st.subtitle || "Help us improve your shopping experience."}
                            </p>
                          </div>
                          <span className="rounded-full border border-line bg-paper px-4 py-1.5 text-[12px] font-medium text-ink">
                            {st.buttonText || "Send feedback"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          {st.promoBadge && (
                            <div className="mb-3 flex items-center gap-2">
                              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                {st.promoBadge}
                              </span>
                              {st.discountHighlight && (
                                <span className="text-[12px] font-medium text-ink">
                                  {st.discountHighlight}
                                </span>
                              )}
                            </div>
                          )}

                          {section.data?.items && section.data.items.length > 0 ? (
                            <div
                              className={`grid gap-3 ${
                                st.columns === 5
                                  ? "grid-cols-2 md:grid-cols-5"
                                  : st.columns === 3
                                    ? "grid-cols-1 sm:grid-cols-3"
                                    : st.columns === 2
                                      ? "grid-cols-1 sm:grid-cols-2"
                                      : "grid-cols-2 md:grid-cols-4"
                              }`}
                            >
                              {section.data.items.map((prod: any) => {
                                const discount = prod.compareAtPrice
                                  ? Math.round(
                                      ((prod.compareAtPrice - prod.price) /
                                        prod.compareAtPrice) *
                                        100,
                                    )
                                  : null;
                                return (
                                  <div
                                    key={prod.id}
                                    className="rounded-card border border-line bg-paper overflow-hidden flex flex-col"
                                  >
                                    <div className="relative aspect-[4/5] bg-surface flex items-center justify-center overflow-hidden">
                                      {prod.image ? (
                                        <img
                                          src={prod.image}
                                          alt={prod.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[11px] text-ink2 px-2 text-center">
                                          No image
                                        </span>
                                      )}
                                      {discount && st.showDiscountBadge !== false && (
                                        <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">
                                          −{discount}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="p-3">
                                      <p className="text-[11px] text-ink2">
                                        {prod.category?.name || "Catalog"}
                                      </p>
                                      <p className="text-[13px] font-medium text-ink truncate mt-0.5">
                                        {prod.name}
                                      </p>
                                      <div className="mt-1 flex items-baseline gap-1.5">
                                        <span className="text-[13px] font-semibold text-ink">
                                          ৳{prod.price?.toLocaleString() || 0}
                                        </span>
                                        {prod.compareAtPrice && (
                                          <span className="text-[11px] text-ink2 line-through">
                                            ৳{prod.compareAtPrice.toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-card border border-dashed border-line p-6 text-center text-[12px] text-ink2">
                              No matching products found for this data source.
                              Configure the data source or publish matching products to display here.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {sections.filter((s) => s.enabled).length === 0 && (
                <div className="py-20 text-center text-[13px] text-ink2">
                  All sections are currently hidden or disabled.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

        {/* PANE 3: Right - Section Settings Inspector (380px) */}
        <div className="flex w-[380px] flex-col border-l border-line bg-paper">
          <div className="border-b border-line px-5 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-ink2">
              Section Customization
            </span>
          </div>

          {selectedSection ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* SECTION TYPE BADGE */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink2 mb-1">
                  Section Type
                </label>
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink font-medium">
                  {selectedSection.type.replace(/_/g, " ")}
                </div>
              </div>

              {/* CARD 1: GENERAL HEADINGS & TYPOGRAPHY */}
              <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                  Typography &amp; Headings
                </span>

                <div>
                  <label className="block text-[11px] font-medium text-ink2 mb-1">
                    Eyebrow / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={selectedSection.settings?.eyebrow || ""}
                    onChange={(e) => updateSettings("eyebrow", e.target.value)}
                    placeholder="e.g. CURATED COLLECTION"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink2 mb-1">
                    Section Heading Title
                  </label>
                  <input
                    type="text"
                    value={selectedSection.settings?.title || ""}
                    onChange={(e) => updateSettings("title", e.target.value)}
                    placeholder="e.g. Recommended Smartphones"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink2 mb-1">
                    Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={selectedSection.settings?.subtitle || ""}
                    onChange={(e) => updateSettings("subtitle", e.target.value)}
                    placeholder="e.g. Handpicked weekly specials with warranty"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              {/* CARD 2: LAYOUT & STYLING */}
              <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                  Styling &amp; Appearance
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Background Tone
                    </label>
                    <select
                      value={selectedSection.settings?.background || "paper"}
                      onChange={(e) => updateSettings("background", e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="paper">Paper White</option>
                      <option value="surface">Subtle Surface</option>
                      <option value="ink">Contrast Ink (Dark)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Spacing Density
                    </label>
                    <select
                      value={selectedSection.settings?.padding || "normal"}
                      onChange={(e) => updateSettings("padding", e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="compact">Compact (py-8)</option>
                      <option value="normal">Standard (py-14)</option>
                      <option value="spacious">Spacious (py-20)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={selectedSection.settings?.showTopBorder !== false}
                    onChange={(e) => updateSettings("showTopBorder", e.target.checked)}
                    className="rounded border-line"
                  />
                  <span className="text-[12px] text-ink">
                    Show top hairline divider
                  </span>
                </label>
              </div>

              {/* CARD 3: HERO SHOWCASE SPECIFIC CONTROLS */}
              {selectedSection.type === "HERO_SHOWCASE" && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Hero Actions &amp; Media
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Hero Layout
                    </label>
                    <select
                      value={selectedSection.settings?.layout || "centered"}
                      onChange={(e) => updateSettings("layout", e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="interactive">Signature Interactive Showcase (Initial Design)</option>
                      <option value="centered">Centered Editorial</option>
                      <option value="split">Split Layout (Text Left, Image Right)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Primary CTA Text
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.ctaText || "Shop collection"}
                        onChange={(e) => updateSettings("ctaText", e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        CTA Link Route
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.ctaUrl || "/products"}
                        onChange={(e) => updateSettings("ctaUrl", e.target.value)}
                        placeholder="/products"
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Secondary CTA (Optional)
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.secondaryCtaText || ""}
                        onChange={(e) => updateSettings("secondaryCtaText", e.target.value)}
                        placeholder="e.g. Special Deals"
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Secondary Link
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.secondaryCtaUrl || "/products?sale=true"}
                        onChange={(e) => updateSettings("secondaryCtaUrl", e.target.value)}
                        placeholder="/products?sale=true"
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  <ImagePicker
                    label="Hero Featured Image / Banner"
                    hint="Displays alongside the headline in Split Layout, or as hero visual."
                    value={selectedSection.settings?.imageUrl || ""}
                    onChange={(url) => updateSettings("imageUrl", url)}
                    folder="storefront/hero"
                  />
                </div>
              )}

              {/* CARD 4: CATEGORY GRID SPECIFIC CONTROLS */}
              {selectedSection.type === "CATEGORY_GRID" && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Category Layout
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Card Style
                      </label>
                      <select
                        value={selectedSection.settings?.layoutStyle || "tiles"}
                        onChange={(e) => updateSettings("layoutStyle", e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      >
                        <option value="tiles">Bordered Tiles</option>
                        <option value="pills">Pill Chips</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Columns (Tiles)
                      </label>
                      <select
                        value={selectedSection.settings?.columns || 5}
                        onChange={(e) => updateSettings("columns", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      >
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                        <option value={5}>5 Columns</option>
                        <option value={6}>6 Columns</option>
                        <option value={8}>8 Columns</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 5: BRAND SHOWCASE SPECIFIC CONTROLS */}
              {selectedSection.type === "BRAND_SHOWCASE" && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Brand Showcase Configuration
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Brand Names (Comma-separated)
                    </label>
                    <textarea
                      rows={3}
                      value={
                        selectedSection.settings?.brandNames ||
                        "Apple, Samsung, Sony, Anker, Baseus, Xiaomi"
                      }
                      onChange={(e) => updateSettings("brandNames", e.target.value)}
                      placeholder="Apple, Samsung, Sony, Anker..."
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Columns
                    </label>
                    <select
                      value={selectedSection.settings?.columns || 6}
                      onChange={(e) => updateSettings("columns", Number(e.target.value))}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value={4}>4 Columns</option>
                      <option value={6}>6 Columns</option>
                      <option value={8}>8 Columns</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CARD 6: TEXT WITH IMAGE SPECIFIC CONTROLS */}
              {selectedSection.type === "TEXT_WITH_IMAGE" && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Story &amp; Editorial Details
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Story Body Text
                    </label>
                    <textarea
                      rows={4}
                      value={selectedSection.settings?.bodyText || ""}
                      onChange={(e) => updateSettings("bodyText", e.target.value)}
                      placeholder="Tell customers about your product standards..."
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <ImagePicker
                    label="Editorial Story Image"
                    hint="Square or 4:3 photo showing your team, packaging, or verified products."
                    value={selectedSection.settings?.imageUrl || ""}
                    onChange={(url) => updateSettings("imageUrl", url)}
                    folder="storefront/editorial"
                  />

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Image Alignment
                    </label>
                    <select
                      value={selectedSection.settings?.imagePosition || "right"}
                      onChange={(e) => updateSettings("imagePosition", e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="right">Image on Right (Default)</option>
                      <option value="left">Image on Left</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.ctaText || "Learn more"}
                        onChange={(e) => updateSettings("ctaText", e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Button Link
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.ctaUrl || "/about"}
                        onChange={(e) => updateSettings("ctaUrl", e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 7: FLASH SALE SPECIFIC CONTROLS */}
              {selectedSection.type === "FLASH_SALE" && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Flash Sale Urgency &amp; Badges
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Urgency Badge Label
                    </label>
                    <input
                      type="text"
                      value={selectedSection.settings?.promoBadge || "FLASH DEAL"}
                      onChange={(e) => updateSettings("promoBadge", e.target.value)}
                      placeholder="e.g. FLASH DEAL"
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Discount Teaser Highlight
                    </label>
                    <input
                      type="text"
                      value={selectedSection.settings?.discountHighlight || ""}
                      onChange={(e) => updateSettings("discountHighlight", e.target.value)}
                      placeholder="e.g. Up to 50% Off - Today Only"
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CARD 8: DATA SOURCE CONFIGURATION (PRODUCT GRID / CAROUSEL / FLASH SALE) */}
              {(selectedSection.type === "PRODUCT_GRID" ||
                selectedSection.type === "PRODUCT_CAROUSEL" ||
                selectedSection.type === "FLASH_SALE") && (
                <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Data Source &amp; Products
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-ink2 mb-1">
                      Product Data Source
                    </label>
                    <select
                      value={selectedSection.dataSource?.type || "LATEST_PRODUCTS"}
                      onChange={(e) => updateDataSource("type", e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="COLLECTION">Curated Collection</option>
                      <option value="LATEST_PRODUCTS">Latest Published Products</option>
                      <option value="BEST_SELLERS">Best Sellers (Sales Ranked)</option>
                      <option value="FLASH_SALE">Active Flash Deals &amp; Discounts</option>
                    </select>
                  </div>

                  {selectedSection.dataSource?.type === "COLLECTION" && (
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Select Collection
                      </label>
                      <select
                        value={selectedSection.dataSource?.collectionId || ""}
                        onChange={(e) => updateDataSource("collectionId", e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      >
                        <option value="">-- Choose Collection --</option>
                        {collections.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Columns (Grid)
                      </label>
                      <select
                        value={selectedSection.settings?.columns || 4}
                        onChange={(e) => updateSettings("columns", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      >
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                        <option value={5}>5 Columns</option>
                        <option value={6}>6 Columns</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Display Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={selectedSection.settings?.productLimit || 8}
                        onChange={(e) =>
                          updateSettings("productLimit", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedSection.settings?.showDiscountBadge !== false}
                      onChange={(e) => updateSettings("showDiscountBadge", e.target.checked)}
                      className="rounded border-line"
                    />
                    <span className="text-[12px] text-ink">
                      Show percentage discount chip (−XX%)
                    </span>
                  </label>
                </div>
              )}

              {/* CARD 9: NAVIGATION & VIEW ALL LINK */}
              <div className="rounded-card border border-line bg-surface/30 p-4 space-y-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink">
                  Navigation &amp; Links
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.settings?.showViewAll !== false}
                    onChange={(e) => updateSettings("showViewAll", e.target.checked)}
                    className="rounded border-line"
                  />
                  <span className="text-[12px] text-ink font-medium">
                    Show &quot;View all&quot; link
                  </span>
                </label>

                {selectedSection.settings?.showViewAll !== false && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Link Text
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.viewAllText || "View all →"}
                        onChange={(e) => updateSettings("viewAllText", e.target.value)}
                        placeholder="View all →"
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink2 mb-1">
                        Destination URL
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings?.viewAllUrl || "/products"}
                        onChange={(e) => updateSettings("viewAllUrl", e.target.value)}
                        placeholder="/products"
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={selectedSection.settings?.hideWhenEmpty !== false}
                    onChange={(e) => updateSettings("hideWhenEmpty", e.target.checked)}
                    className="rounded border-line"
                  />
                  <span className="text-[12px] text-ink">
                    Hide section if 0 items found
                  </span>
                </label>
              </div>

              {/* CARD 10: REMOVE SECTION */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => removeSection(selectedSection.id)}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50/50 py-2.5 text-[12px] font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  Remove Section
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 text-center text-[13px] text-ink2">
              Select a section from the left outline to configure its properties.
            </div>
          )}
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-card border border-line bg-paper p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-[16px] font-semibold text-ink">Add New Section</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[440px] overflow-y-auto space-y-2">
              {AVAILABLE_SECTION_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.type}
                  onClick={() => addSection(tmpl)}
                  className="flex items-start justify-between rounded-lg border border-line p-3 transition hover:border-ink hover:bg-surface cursor-pointer"
                >
                  <div className="pr-4">
                    <h4 className="text-[13px] font-semibold text-ink">{tmpl.label}</h4>
                    <p className="mt-0.5 text-[12px] text-ink2">{tmpl.description}</p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink border border-line shrink-0">
                    Add
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates & Presets Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-2xl rounded-card border border-line bg-paper p-6 shadow-none">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">
                  Storefront Templates &amp; Presets
                </h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  Select a pre-architected design foundation for your store or start from scratch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
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
                      className="shrink-0 rounded-full bg-ink px-4 py-2 text-[12px] font-medium text-white transition hover:opacity-85"
                    >
                      Apply Preset
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] font-medium text-ink2 opacity-60 cursor-not-allowed"
                      title="Only platform administrator can provision this template"
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
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold text-ink">
                        Modern Clean Retail
                      </h4>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-ink2 border border-line">
                        Standard Editorial
                      </span>
                    </div>
                    <p className="text-[12px] text-ink2 leading-relaxed">
                      Clean commercial storefront layout featuring split hero banner, trending product carousel, authentic trust guarantee block, and time-limited flash deals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyModernRetailTemplate}
                    className="shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-[12px] font-medium text-ink transition hover:bg-surface"
                  >
                    Apply Preset
                  </button>
                </div>
              </div>

              {/* Option 3: Blank Canvas */}
              <div className="rounded-xl border border-line bg-paper p-4 transition hover:border-rose-400">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold text-ink">
                        Blank Canvas (Custom from Zero)
                      </h4>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-500/20">
                        Clean Slate
                      </span>
                    </div>
                    <p className="text-[12px] text-ink2 leading-relaxed">
                      Clears all sections so you can handcraft the homepage block-by-block using the section palette. Perfect for organizations creating a completely custom storefront.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyBlankCanvasTemplate}
                    className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-700 transition hover:bg-rose-100"
                  >
                    Start from Zero
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History & Rollback Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-card border border-line bg-paper p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-[16px] font-semibold text-ink">
                Publication History &amp; Rollback
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[380px] overflow-y-auto divide-y divide-line">
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
                      className="rounded-full border border-line px-3 py-1 text-[11px] font-medium text-ink transition hover:bg-surface"
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
    </div>
  );
}
