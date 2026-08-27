"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CatalogProduct, formatTaka } from "@/lib/catalog";

interface FlashSaleCardProps {
  product: CatalogProduct;
  initialDays?: number;
  initialHours?: number;
  initialMinutes?: number;
}

export default function FlashSaleCard({
  product,
  initialDays = 17,
  initialHours = 8,
  initialMinutes = 30,
}: FlashSaleCardProps) {
  const outOfStock = product.availableStock === 0;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 20; // default discount percentage for flash sale demo

  // Countdown timer ticker state
  const [seconds, setSeconds] = useState(45);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="group block rounded-card border border-line bg-paper p-3.5 transition hover:border-ink/30 shadow-sm flex flex-col justify-between">
      <div>
        {/* Product Image Box */}
        <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-card bg-surface">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-ink2">
              Product image coming soon
            </div>
          )}

          {/* Minimalist Black Discount Tag */}
          {discount && !outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              −{discount}%
            </span>
          )}

          {outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink2 ring-1 ring-line">
              Out of stock
            </span>
          )}
        </Link>

        {/* Product Meta */}
        <div className="mt-3">
          <p className="text-[12px] text-ink2">{product.category.name}</p>
          <Link href={`/products/${product.slug}`}>
            <h3 className="mt-0.5 text-[14px] font-medium text-ink line-clamp-1 hover:underline">
              {product.name}
            </h3>
          </Link>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[14px] font-semibold text-ink">
              {formatTaka(product.price)}
            </span>
            {(product.compareAtPrice || discount) && (
              <span className="text-[12px] text-ink2 line-through">
                {formatTaka(product.compareAtPrice || Math.round(product.price * 1.25))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Black & White Modern Countdown Timer Box */}
      <div className="mt-4">
        <div className="rounded-card border border-line bg-surface p-2.5 text-center">
          <div className="grid grid-cols-4 gap-1 text-center divide-x divide-line">
            <div className="px-1">
              <span className="block text-[13px] font-bold font-mono text-ink leading-none">
                {String(initialDays).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-ink2 font-medium mt-1">
                DAYS
              </span>
            </div>
            <div className="px-1">
              <span className="block text-[13px] font-bold font-mono text-ink leading-none">
                {String(initialHours).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-ink2 font-medium mt-1">
                HRS
              </span>
            </div>
            <div className="px-1">
              <span className="block text-[13px] font-bold font-mono text-ink leading-none">
                {String(initialMinutes).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-ink2 font-medium mt-1">
                MIN
              </span>
            </div>
            <div className="px-1">
              <span className="block text-[13px] font-bold font-mono text-ink leading-none">
                {String(seconds).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-ink2 font-medium mt-1">
                SEC
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={`/products/${product.slug}`}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink py-2.5 text-[12px] font-medium text-white transition hover:opacity-85 shadow-sm"
        >
          <span>View deal</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
