import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store";

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
  const store = await getStoreConfig().catch(() => fallbackStoreConfig);
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans text-ink antialiased`}>
        <CartProvider>
          <Header storeName={store.storeName} />
          {children}
          <Footer store={store} />
        </CartProvider>
      </body>
    </html>
  );
}
