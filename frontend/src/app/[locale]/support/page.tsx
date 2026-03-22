import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import SupportPageClient from "./SupportPageClient";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("faqs.q1"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faqs.a1"),
        },
      },
      {
        "@type": "Question",
        name: t("faqs.q2"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faqs.a2"),
        },
      },
      {
        "@type": "Question",
        name: t("faqs.q3"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faqs.a3"),
        },
      },
      {
        "@type": "Question",
        name: t("faqs.q4"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faqs.a4"),
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <SupportPageClient />
    </>
  );
}
