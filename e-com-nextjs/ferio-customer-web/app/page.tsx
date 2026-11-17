import type { Metadata } from "next";
import { getPublishedStorefrontPage } from "@/lib/storefront";
import StorefrontLiveRenderer from "@/components/storefront/StorefrontLiveRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getPublishedStorefrontPage("home").catch(() => null);
  const title =
    pageData?.seoTitle ||
    pageData?.title ||
    "Ferio — Modern Multi-Tenant Commerce";
  const description =
    pageData?.seoDescription ||
    "Curated quality products delivered nationwide Bangladesh with verified stock and genuine warranty.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface HomePageProps {
  searchParams?: {
    preview?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const isPreview = searchParams?.preview === "true";
  const pageData = await getPublishedStorefrontPage("home", isPreview).catch(() => null);

  return (
    <StorefrontLiveRenderer
      initialSections={pageData?.sections || []}
      isPreview={isPreview}
      pageVersionNumber={pageData?.versionNumber}
    />
  );
}
