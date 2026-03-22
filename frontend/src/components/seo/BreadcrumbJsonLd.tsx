import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl, type AppLocale } from "@/lib/seo";

interface BreadcrumbItem {
  name: string;
  path?: string;
}

export function BreadcrumbJsonLd({
  locale,
  items,
}: {
  locale: AppLocale;
  items: BreadcrumbItem[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: getCanonicalUrl(locale, item.path) } : {}),
    })),
  };

  return <JsonLd data={schema} />;
}
