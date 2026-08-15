"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import CategoryNav from "./CategoryNav";
import type { CatalogCategory } from "@/lib/catalog";

export default function Header({
  storeName,
  categories = [],
  categoryTopNavEnabled = true,
}: {
  storeName: string;
  categories?: CatalogCategory[];
  categoryTopNavEnabled?: boolean;
}) {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur">
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-[19px] font-semibold tracking-tight text-ink">
            {storeName}
          </Link>
          <nav className="hidden gap-9 text-[13px] text-ink2 md:flex">
            <Link href="/products" className="transition hover:text-ink">
              Shop all
            </Link>
            <Link href="/#categories" className="transition hover:text-ink">
              Categories
            </Link>
            <Link href="/track" className="transition hover:text-ink">
              Track order
            </Link>
            <Link href="/support" className="transition hover:text-ink">
              Support
            </Link>
            <Link href="/services" className="transition hover:text-ink">Services</Link>
            <Link href="/account/orders" className="transition hover:text-ink">Sign in / Account</Link>
            <Link href="/account/warranty" className="transition hover:text-ink">Warranty</Link>
          </nav>
          <Link
            href="/cart"
            className="flex items-center gap-2 text-[13px] text-ink transition hover:text-ink2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6l-1-3H2" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="17" cy="20" r="1" />
            </svg>
            <span>Cart</span>
            {count > 0 && <span className="text-ink2">({count})</span>}
          </Link>
        </div>
      </div>
      {categoryTopNavEnabled && <CategoryNav categories={categories} />}
    </header>
  );
}
