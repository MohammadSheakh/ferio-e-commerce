"use client";

import { FormEvent, useEffect, useState, MouseEvent } from "react";
import Topbar from "@/components/Topbar";

export interface HotspotItem {
  id?: string;
  x: string; // e.g. "30%"
  y: string; // e.g. "45%"
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
          title: "Modern Scandinavian Sofa",
          subtitle: "৳45,000",
          link: "/products/scandinavian-sofa",
          image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80"
        },
        {
          x: "72%",
          y: "34%",
          title: "Minimalist Lounge Chair",
          subtitle: "৳22,500",
          link: "/products/lounge-chair"
        },
        {
          x: "30%",
          y: "65%",
          title: "Solid Wood Coffee Table",
          subtitle: "৳18,000",
          link: "/products/coffee-table"
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
          title: "Executive Oak Desk",
          subtitle: "৳58,000",
          link: "/products/oak-desk"
        },
      ],
    },
    rightCard: {
      image:
        "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
      link: "/products?category=lighting",
    },
  },
];

export default function AdminHeroShowcasePage() {
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentSlide = slides[activeSlideIdx] || slides[0];

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/hero-showcase", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (response.ok && payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
          setSlides(payload.data);
        }
      } catch (err) {
        console.error("Failed to load hero showcase settings", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/hero-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to save showcase slides");
      }
      setMessage("Hero Showcase carousel updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateCurrentSlide = (updater: (prev: SlideData) => SlideData) => {
    setSlides((prev) =>
      prev.map((slide, idx) => (idx === activeSlideIdx ? updater(slide) : slide))
    );
  };

  const handleImageClickToPlacePin = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xPct = Math.round((clickX / rect.width) * 100) + "%";
    const yPct = Math.round((clickY / rect.height) * 100) + "%";

    const newHotspot: HotspotItem = {
      x: xPct,
      y: yPct,
      title: "New Featured Item",
      subtitle: "৳10,000",
      link: "/products",
    };

    updateCurrentSlide((prev) => ({
      ...prev,
      centerCard: {
        ...prev.centerCard,
        hotspots: [...prev.centerCard.hotspots, newHotspot],
      },
    }));

    setActiveHotspotIdx(currentSlide.centerCard.hotspots.length);
  };

  const addSlide = () => {
    const newId = slides.length > 0 ? Math.max(...slides.map((s) => s.id)) + 1 : 1;
    const newSlide: SlideData = {
      id: newId,
      watermarks: { left: "НОВИНКА", center: "СТИЛЬ", right: "УЮТ" },
      leftCard: {
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
        title: "НОВАЯ КОЛЛЕКЦИЯ ИНТЕРЬЕРА",
        description: "Современные дизайнерские решения для вашего пространства.",
        link: "/products",
      },
      centerCard: {
        discount: "-15%",
        badge: "СПЕЦПРЕДЛОЖЕНИЕ",
        subtitle: "на выбранные товары",
        topBg: "bg-[#18181b] text-white",
        bottomBg: "bg-[#27272a] text-white",
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
        actionText: "Узнать подробности!",
        link: "/products",
        hotspots: [
          { x: "50%", y: "50%", title: "Modern Design Item", subtitle: "৳15,000", link: "/products" }
        ],
      },
      rightCard: {
        image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
        link: "/products",
      },
    };
    setSlides([...slides, newSlide]);
    setActiveSlideIdx(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert("At least one slide is required.");
      return;
    }
    const updated = slides.filter((_, idx) => idx !== index);
    setSlides(updated);
    setActiveSlideIdx(Math.max(0, index - 1));
  };

  const deleteHotspot = (hIdx: number) => {
    updateCurrentSlide((prev) => ({
      ...prev,
      centerCard: {
        ...prev.centerCard,
        hotspots: prev.centerCard.hotspots.filter((_, idx) => idx !== hIdx),
      },
    }));
    setActiveHotspotIdx(null);
  };

  const updateHotspot = (hIdx: number, field: keyof HotspotItem, val: string) => {
    updateCurrentSlide((prev) => ({
      ...prev,
      centerCard: {
        ...prev.centerCard,
        hotspots: prev.centerCard.hotspots.map((spot, idx) =>
          idx === hIdx ? { ...spot, [field]: val } : spot
        ),
      },
    }));
  };

  const inputClass =
    "mt-1 w-full rounded-md border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white";

  return (
    <>
      <Topbar
        title="Hero Showcase Carousel"
        subtitle="Manage landing page interactive carousel slides, images, typography watermarks, and hotspot pins."
      />
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {loading ? (
          <p className="py-12 text-center text-sm text-ink2">Loading showcase settings...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Header Controls: Slide Tabs & Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {slides.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => {
                      setActiveSlideIdx(idx);
                      setActiveHotspotIdx(null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                      activeSlideIdx === idx
                        ? "bg-ink text-white border-ink shadow-sm"
                        : "bg-surface text-ink border-line hover:border-ink"
                    }`}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addSlide}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-dashed border-line text-ink hover:border-ink transition"
                >
                  + Add Slide
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => deleteSlide(activeSlideIdx)}
                  className="px-3.5 py-2 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition"
                >
                  Delete Slide {activeSlideIdx + 1}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:opacity-90 disabled:opacity-50 shadow transition"
                >
                  {saving ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </div>

            {error && (
              <p className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                {error}
              </p>
            )}
            {message && (
              <p className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                {message}
              </p>
            )}

            {currentSlide && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Form Controls (6 cols) */}
                <div className="lg:col-span-6 space-y-6">
                  
                  {/* Background Typography Watermarks */}
                  <div className="p-5 border border-line rounded-xl bg-surface/50 space-y-3">
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                      1. Background Watermarks
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="text-xs text-ink2">
                        Left Text
                        <input
                          type="text"
                          value={currentSlide.watermarks?.left || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              watermarks: { ...prev.watermarks, left: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs text-ink2">
                        Center Text
                        <input
                          type="text"
                          value={currentSlide.watermarks?.center || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              watermarks: { ...prev.watermarks, center: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs text-ink2">
                        Right Text
                        <input
                          type="text"
                          value={currentSlide.watermarks?.right || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              watermarks: { ...prev.watermarks, right: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Left Column Card */}
                  <div className="p-5 border border-line rounded-xl bg-surface/50 space-y-3">
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                      2. Left Column Card
                    </h3>
                    <label className="block text-xs text-ink2">
                      Image URL
                      <input
                        type="text"
                        value={currentSlide.leftCard?.image || ""}
                        onChange={(e) =>
                          updateCurrentSlide((prev) => ({
                            ...prev,
                            leftCard: { ...prev.leftCard, image: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-xs text-ink2">
                      Headline Title
                      <input
                        type="text"
                        value={currentSlide.leftCard?.title || ""}
                        onChange={(e) =>
                          updateCurrentSlide((prev) => ({
                            ...prev,
                            leftCard: { ...prev.leftCard, title: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-xs text-ink2">
                        Description Text
                        <input
                          type="text"
                          value={currentSlide.leftCard?.description || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              leftCard: { ...prev.leftCard, description: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs text-ink2">
                        Target Link
                        <input
                          type="text"
                          value={currentSlide.leftCard?.link || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              leftCard: { ...prev.leftCard, link: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Center Promo Card Data */}
                  <div className="p-5 border border-line rounded-xl bg-surface/50 space-y-3">
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                      3. Center Showcase Card Image
                    </h3>
                    <label className="block text-xs text-ink2">
                      Center Main Showcase Image URL
                      <input
                        type="text"
                        value={currentSlide.centerCard?.image || ""}
                        onChange={(e) =>
                          updateCurrentSlide((prev) => ({
                            ...prev,
                            centerCard: { ...prev.centerCard, image: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {/* Right Column Card */}
                  <div className="p-5 border border-line rounded-xl bg-surface/50 space-y-3">
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                      4. Right Column Preview Card
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-ink2">
                        Image URL
                        <input
                          type="text"
                          value={currentSlide.rightCard?.image || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              rightCard: { ...prev.rightCard, image: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs text-ink2">
                        Target Link
                        <input
                          type="text"
                          value={currentSlide.rightCard?.link || ""}
                          onChange={(e) =>
                            updateCurrentSlide((prev) => ({
                              ...prev,
                              rightCard: { ...prev.rightCard, link: e.target.value },
                            }))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                </div>

                {/* Right Column: Visual Hotspot Manager (6 cols) */}
                <div className="lg:col-span-6 space-y-6">
                  
                  <div className="p-5 border border-line rounded-xl bg-white space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                          5. Visual Interactive Hotspot Pins
                        </h3>
                        <p className="text-xs text-ink2 mt-0.5">
                          Click anywhere on the image below to set a new hotspot pin location!
                        </p>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-1 bg-surface rounded border text-ink font-semibold">
                        {currentSlide.centerCard?.hotspots?.length || 0} Pins
                      </span>
                    </div>

                    {/* Interactive Image Box */}
                    <div
                      onClick={handleImageClickToPlacePin}
                      className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-zinc-100 cursor-crosshair group shadow-inner"
                    >
                      {currentSlide.centerCard?.image ? (
                        <img
                          src={currentSlide.centerCard.image}
                          alt="Main showcase center preview"
                          className="w-full h-full object-cover pointer-events-none select-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-ink2">
                          No Image Provided
                        </div>
                      )}

                      {/* Overlaid Hotspot Dots */}
                      {currentSlide.centerCard?.hotspots?.map((spot, hIdx) => {
                        const isSelected = activeHotspotIdx === hIdx;
                        return (
                          <div
                            key={hIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHotspotIdx(hIdx);
                            }}
                            style={{ left: spot.x, top: spot.y }}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                              isSelected ? "scale-125 z-20" : "hover:scale-110 z-10"
                            }`}
                          >
                            <span className="relative flex h-6 w-6 items-center justify-center">
                              <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                  isSelected ? "bg-amber-400" : "bg-white"
                                }`}
                              />
                              <span
                                className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-md border ${
                                  isSelected
                                    ? "bg-amber-400 text-black border-black"
                                    : "bg-white text-ink border-black/20"
                                }`}
                              >
                                {hIdx + 1}
                              </span>
                            </span>
                          </div>
                        );
                      })}

                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full pointer-events-none">
                        🎯 Click image to add hotspot pin
                      </div>
                    </div>

                    {/* Hotspots List & Detail Editor */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                        Hotspot Details & Tooltip Links
                      </h4>

                      {currentSlide.centerCard?.hotspots?.length === 0 ? (
                        <p className="text-xs text-ink2 italic">
                          No hotspots added yet. Click on the image above to add pins!
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {currentSlide.centerCard.hotspots.map((spot, hIdx) => {
                            const isSelected = activeHotspotIdx === hIdx;
                            return (
                              <div
                                key={hIdx}
                                className={`p-4 border rounded-xl transition ${
                                  isSelected
                                    ? "border-amber-400 bg-amber-50/20 shadow-sm"
                                    : "border-line bg-surface/30 hover:border-ink/30"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold">
                                      {hIdx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-ink">
                                      Pin {hIdx + 1} ({spot.x}, {spot.y})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deleteHotspot(hIdx)}
                                    className="text-[11px] text-rose-600 hover:underline"
                                  >
                                    Remove Pin
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <label className="text-[11px] text-ink2">
                                    Product Title
                                    <input
                                      type="text"
                                      value={spot.title || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "title", e.target.value)
                                      }
                                      placeholder="e.g. Lounge Chair"
                                      className={inputClass}
                                    />
                                  </label>
                                  <label className="text-[11px] text-ink2">
                                    Price / Subtitle
                                    <input
                                      type="text"
                                      value={spot.subtitle || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "subtitle", e.target.value)
                                      }
                                      placeholder="e.g. ৳22,500"
                                      className={inputClass}
                                    />
                                  </label>
                                  <label className="text-[11px] text-ink2">
                                    Target Product Link
                                    <input
                                      type="text"
                                      value={spot.link || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "link", e.target.value)
                                      }
                                      placeholder="e.g. /products/lounge-chair"
                                      className={inputClass}
                                    />
                                  </label>
                                  <label className="text-[11px] text-ink2">
                                    Tooltip Image URL (Optional)
                                    <input
                                      type="text"
                                      value={spot.image || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "image", e.target.value)
                                      }
                                      placeholder="https://..."
                                      className={inputClass}
                                    />
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                  <label className="text-[11px] text-ink2">
                                    Position X (%)
                                    <input
                                      type="text"
                                      value={spot.x || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "x", e.target.value)
                                      }
                                      className={inputClass}
                                    />
                                  </label>
                                  <label className="text-[11px] text-ink2">
                                    Position Y (%)
                                    <input
                                      type="text"
                                      value={spot.y || ""}
                                      onChange={(e) =>
                                        updateHotspot(hIdx, "y", e.target.value)
                                      }
                                      className={inputClass}
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            )}

          </form>
        )}

      </main>
    </>
  );
}
