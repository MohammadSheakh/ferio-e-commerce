import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ferio Admin",
  description: "Operations dashboard for Ferio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
