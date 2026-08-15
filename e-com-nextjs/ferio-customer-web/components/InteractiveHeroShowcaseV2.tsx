"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export interface HotspotItem {
  id?: string;
  x: string;
  y: string;
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
}

export interface SlideData {
  id: number;
  watermarks: {
    left: string;
    center: string;
    right: string;
  };
  leftCard: {
    image: string;
    title: string;
    description: string;
    link: string;
  };
  centerCard: {
    discount?: string;
    badge?: string;
    subtitle?: string;
    topBg?: string;
    bottomBg?: string;
    image: string;
    actionText?: string;
    link?: string;
    hotspots: HotspotItem[];
  };
  rightCard: {
    image: string;
    link: string;
  };
}

const DEFAULT_SLIDES: SlideData[] = [
  {
    id: 1,
    watermarks: {
      left: "КАМИНЫ",
      center: "ЛОФТ",
      right: "ПРОВАНС",
    },
    leftCard: {
      image:
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
      title: "МЕБЕЛЬ И АКСЕССУАРЫ ДЛЯ СОВРЕМЕННОГО ИНТЕРЬЕРА",
      description:
        "Воспользуйтесь нашими идеями, чтобы создать интерьер, подходящий вам.",
      link: "/products?category=living-room",
    },
    centerCard: {
      discount: "-30%",
      badge: "от цены на сайте",
      subtitle: "на мебель из наличия",
      topBg: "bg-[#fadb14] text-ink",
      bottomBg: "bg-[#5c4cb0] text-white",
      image:
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
      actionText: "Большая распродажа мебели!",
      link: "/products?sale=true",
      hotspots: [
        {
          x: "24%",
          y: "30%",
          title: "Scandinavian Velvet Sofa",
          subtitle: "৳45,000",
          link: "/products/scandinavian-sofa",
          image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80"
        },
        {
          x: "72%",
          y: "34%",
          title: "Minimalist Lounge Chair",
          subtitle: "৳22,500",
          link: "/products/lounge-chair",
          image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=200&q=80"
        },
        {
          x: "30%",
          y: "65%",
          title: "Solid Wood Coffee Table",
          subtitle: "৳18,000",
          link: "/products/coffee-table"
        },
        {
          x: "78%",
          y: "72%",
          title: "Nordic Floor Lamp",
          subtitle: "৳9,500",
          link: "/products/floor-lamp"
        },
      ],
    },
    rightCard: {
      image:
        "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
      link: "/products?category=tables",
    },
  },
  {
    id: 2,
    watermarks: {
      left: "СКАНДИ",
      center: "МИНИМАЛИЗМ",
      right: "СТУДИЯ",
    },
    leftCard: {
      image:
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
      title: "ЭРГОНОМИЧНЫЕ РАБОЧИЕ ЗОНЫ И СТУДИИ",
      description:
        "Организуйте удобный и стильный кабинет для продуктивной работы дома.",
      link: "/products?category=workspace",
    },
    centerCard: {
      discount: "NEW",
      badge: "КОЛЛЕКЦИЯ 2026",
      subtitle: "эксклюзивные столы и стулья",
      topBg: "bg-[#18181b] text-white",
      bottomBg: "bg-[#27272a] text-white",
      image:
        "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80",
      actionText: "Смотреть студийную серию!",
      link: "/products?category=workspace",
      hotspots: [
        {
          x: "30%",
          y: "28%",
          title: "Ergonomic Desk Lamp",
          subtitle: "৳6,500",
          link: "/products/desk-lamp"
        },
        {
          x: "65%",
          y: "52%",
          title: "Executive Desk Studio",
          subtitle: "৳58,000",
          link: "/products/workspace"
        },
      ],
    },
    rightCard: {
      image:
        "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
      link: "/products?category=lighting",
    },
  },
  {
    id: 3,
    watermarks: {
      left: "ПРЕМИУМ",
      center: "АРХИТЕКТУРА",
      right: "ЭКО",
    },
    leftCard: {
      image:
        "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80",
      title: "АРХИТЕКТУРНЫЕ ФОРМЫ И ПРЕМИУМ ДЕКОР",
      description:
        "Лаконичные решения, подчеркивающие эстетику и статус вашего дома.",
      link: "/products?category=premium",
    },
    centerCard: {
      discount: "-20%",
      badge: "СКИДКИ СЕЗОНА",
      subtitle: "на мягкую мебель и кресла",
      topBg: "bg-[#ea580c] text-white",
      bottomBg: "bg-[#1e1b4b] text-white",
      image:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
      actionText: "Перейти в каталог премиум!",
      link: "/products?tag=premium",
      hotspots: [
        {
          x: "48%",
          y: "35%",
          title: "Architectural Armchair",
          subtitle: "৳32,000",
          link: "/products/armchair"
        },
        {
          x: "72%",
          y: "68%",
          title: "Luxury Eco Carpet",
          subtitle: "৳14,500",
          link: "/products/carpet"
        },
      ],
    },
    rightCard: {
      image:
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      link: "/products?category=decor",
    },
  },
];

export default function InteractiveHeroShowcaseV2() {
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeHotspotIndex, setActiveHotspotIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadSlides() {
      try {
        const res = await fetch("/api/hero-showcase", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
          setSlides(json.data);
        }
      } catch (err) {
        console.error("Using default hero showcase slides", err);
      }
    }
    void loadSlides();
  }, []);

  const slide = slides[activeSlideIndex] || slides[0] || DEFAULT_SLIDES[0];

  const handleNext = () => {
    setActiveHotspotIndex(null);
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setActiveHotspotIndex(null);
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative overflow-hidden bg-[#fbfbfb] border-b border-line py-10 md:py-16 select-none">
      {/* Background Category Watermark Typography (get.ru style) */}
      <div className="absolute inset-x-0 top-2 z-0 flex items-center justify-between px-6 md:px-16 pointer-events-none opacity-20">
        <span className="text-5xl sm:text-7xl md:text-[130px] font-black uppercase text-[#d0d0d4] tracking-widest transition-all duration-700">
          {slide.watermarks?.left || "FERIO"}
        </span>
        <span className="hidden sm:inline text-5xl sm:text-7xl md:text-[130px] font-black uppercase text-[#d0d0d4] tracking-widest transition-all duration-700">
          {slide.watermarks?.center || "SHOWCASE"}
        </span>
        <span className="text-5xl sm:text-7xl md:text-[130px] font-black uppercase text-[#d0d0d4] tracking-widest transition-all duration-700">
          {slide.watermarks?.right || "DESIGN"}
        </span>
      </div>

      <div className="relative z-10 mx-auto max-w-[1360px] px-4 sm:px-6">

        {/* get.ru Landing Page Hero 3-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">

          {/* Left Column: Image Card + Headline & Subtitle */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full">
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm transition hover:shadow-md">
              <Image
                src={slide.leftCard.image}
                alt={slide.leftCard.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 33vw"
                priority
              />
              {/* Shopping Bag Button Overlay at Bottom Left */}
              <Link
                href={slide.leftCard.link}
                aria-label="View collection"
                className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-md backdrop-blur-sm transition hover:scale-110"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </Link>
            </div>

            {/* Headline and Sub-description Text */}
            <div className="mt-6 px-1">
              <h2 className="text-xl sm:text-2xl md:text-[26px] font-extrabold tracking-tight text-ink uppercase leading-[1.12]">
                {slide.leftCard.title}
              </h2>
              <p className="mt-3 text-sm text-ink2 leading-relaxed max-w-sm">
                {slide.leftCard.description}
              </p>
            </div>
          </div>

          {/* Center Column: Prominent Split Promo Card (get.ru signature) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="relative flex flex-col overflow-hidden rounded-[30px] border border-line bg-paper shadow-xl h-full justify-between">

              {/* Top Promo Header Block */}
              {/* <div className={`p-6 sm:p-8 transition-colors duration-500 ${slide.centerCard.topBg || "bg-[#fadb14] text-ink"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">
                    {slide.centerCard.discount}
                  </span>
                  <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ink shadow-sm transform -rotate-2">
                    {slide.centerCard.badge}
                  </span>
                </div>
                <h3 className="mt-2.5 text-base sm:text-lg font-bold tracking-tight">
                  {slide.centerCard.subtitle}
                </h3>
              </div> */}

              {/* Middle Showcase Image + Hotspot Pins */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                <Image
                  src={slide.centerCard.image}
                  alt={slide.centerCard.subtitle || slide.centerCard.actionText || "Featured showcase product"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />

                {/* Hotspot Pins & Interactive Tooltips */}
                {slide.centerCard.hotspots?.map((spot, idx) => {
                  const isActive = activeHotspotIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                      style={{ left: spot.x, top: spot.y }}
                    >
                      {/* Hotspot Pulse Button Pin */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHotspotIndex(isActive ? null : idx);
                        }}
                        aria-label={`View item: ${spot.title || "Product"}`}
                        className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-125 focus:outline-none ${isActive ? "scale-125 z-30" : ""
                          }`}
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
                        <span className={`relative flex h-6 w-6 items-center justify-center rounded-full shadow-lg border border-black/20 text-xs font-bold ${isActive ? "bg-amber-400 text-black border-black" : "bg-white text-ink"
                          }`}>
                          •
                        </span>
                      </button>

                      {/* Floating Interactive Tooltip Pop-over Card */}
                      {isActive && (
                        <div className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-64 rounded-2xl bg-black/90 p-4 text-white shadow-2xl backdrop-blur-md border border-white/20 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {/* Close X button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHotspotIndex(null);
                            }}
                            className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-white text-xs font-bold p-1"
                          >
                            ✕
                          </button>

                          {/* Optional Thumbnail Image */}
                          {spot.image && (
                            <div className="relative h-28 w-full overflow-hidden rounded-lg mb-2.5 bg-zinc-800">
                              <Image
                                src={spot.image}
                                alt={spot.title || "Product hotspot"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                            {spot.title || "Featured Item"}
                          </h4>

                          {spot.subtitle && (
                            <p className="mt-1 text-xs font-semibold text-amber-400">
                              {spot.subtitle}
                            </p>
                          )}

                          {/* Action Button Link to Specific Product Page */}
                          <Link
                            href={spot.link || "/products"}
                            className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-amber-400 hover:text-black shadow-md"
                          >
                            <span>View Product</span>
                            <span>→</span>
                          </Link>

                          {/* Tooltip Down Arrow */}
                          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-black/90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Promo Action Footer Block */}
              {/* <div className={`flex items-center justify-between p-5 sm:p-6 transition-colors duration-500 ${slide.centerCard.bottomBg || "bg-[#5c4cb0] text-white"}`}>
                <Link
                  href={slide.centerCard.link}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow transition hover:scale-110"
                  aria-label="Shop promo"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 11V7a4 4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </Link>

                <Link
                  href={slide.centerCard.link}
                  className="text-sm font-bold text-white flex items-center gap-2 hover:underline"
                >
                  <span>{slide.centerCard.actionText}</span>
                  <span>→</span>
                </Link>
              </div> */}

            </div>
          </div>

          {/* Right Column: Secondary Lifestyle Photo Card */}
          <div className="lg:col-span-3 flex flex-col justify-end h-full">
            <div className="group relative aspect-[4/3] sm:aspect-[3/4] w-full overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm transition hover:shadow-md">
              <Image
                src={slide.rightCard.image}
                alt="Furniture showcase"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 25vw"
              />
              {/* Shopping Bag Button Overlay at Bottom Left */}
              <Link
                href={slide.rightCard.link}
                aria-label="View collection"
                className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-md backdrop-blur-sm transition hover:scale-110"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Control Bar: Counter + Red Indicator Line + Arrow Buttons (get.ru signature) */}
        <div className="mt-10 flex items-center justify-between px-2 sm:px-4">

          {/* Progress Counter & Line */}
          <div className="flex items-center gap-4 text-xs font-bold font-mono text-ink">
            <span>0{activeSlideIndex + 1}</span>
            <div className="relative h-[2px] w-36 sm:w-60 bg-line overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-red-500 transition-all duration-500"
                style={{
                  width: `${((activeSlideIndex + 1) / slides.length) * 100}%`,
                }}
              />
            </div>
            <span>0{slides.length}</span>
          </div>

          {/* Navigation Arrow Circle Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-ink transition hover:border-ink hover:bg-ink hover:text-white shadow-sm"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-ink transition hover:border-ink hover:bg-ink hover:text-white shadow-sm"
            >
              →
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
