import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import Header from "@/components/Header";
import CategorySideNav from "@/components/CategorySideNav";
import Footer from "@/components/Footer";
import PurchaseActivityToast from "@/components/PurchaseActivityToast";
import LiveChatWidget from "@/components/LiveChatWidget";
import PageTracker from "@/components/PageTracker";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store";
import { getCategories } from "@/lib/catalog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreConfig().catch(() => fallbackStoreConfig);
  return {
    title: `${store.storeName} — Shop Online`,
    description: `Browse current products, delivery options, and order support from ${store.storeName}.`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, categories] = await Promise.all([
    getStoreConfig().catch(() => fallbackStoreConfig),
    getCategories().catch(() => []),
  ]);
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans text-ink antialiased`}>
        <CartProvider>
          <Header
            storeName={store.storeName}
            categories={categories}
            categoryTopNavEnabled={store.categoryTopNavEnabled ?? true}
          />
          {children}
          {store.categorySideNavEnabled && (
            <CategorySideNav categories={categories} />
          )}
          <Footer store={store} />
          <PurchaseActivityToast />
          <LiveChatWidget />
          <PageTracker />
        </CartProvider>
      </body>
    </html>
  );
}
