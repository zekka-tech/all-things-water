import type { Product } from "@/types";
import { env } from "@/lib/env";

interface BreadcrumbItem {
  name: string;
  url: string;
}

function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function JsonLdOrganization() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "All Things Water",
    url: "https://allthingswater.co.za",
    logo: "https://allthingswater.co.za/favicon.svg",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: env.companyPhone,
      contactType: "customer service",
    },
    ...(env.companyAddress && {
      address: {
        "@type": "PostalAddress",
        streetAddress: env.companyAddress,
      },
    }),
  };

  return <JsonLdScript data={org} />;
}

export function JsonLdProduct({ product }: { product: Product }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    ...(product.image && {
      image: product.image.startsWith("http")
        ? product.image
        : `https://allthingswater.co.za${product.image}`,
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return <JsonLdScript data={schema} />;
}

export function JsonLdBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const listItems = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: listItems,
  };

  return <JsonLdScript data={schema} />;
}
