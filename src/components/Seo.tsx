import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
}

function ensureMeta(selector: string, attrs: Record<string, string>) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => tag!.setAttribute(key, value));
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureLink(rel: string) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  return link;
}

export function Seo({ title, description, canonicalPath, noIndex = false }: Props) {
  const location = useLocation();

  useEffect(() => {
    document.title = `${title} · All Things Water`;

    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const canonicalUrl = new URL(
      canonicalPath ?? `${location.pathname}${location.search}`,
      siteUrl,
    ).toString();

    if (description) {
      ensureMeta('meta[name="description"]', { name: "description" }).setAttribute(
        "content",
        description,
      );
      ensureMeta('meta[property="og:description"]', { property: "og:description" }).setAttribute(
        "content",
        description,
      );
      ensureMeta('meta[name="twitter:description"]', { name: "twitter:description" }).setAttribute(
        "content",
        description,
      );
    }

    ensureMeta('meta[property="og:title"]', { property: "og:title" }).setAttribute(
      "content",
      document.title,
    );
    ensureMeta('meta[name="twitter:title"]', { name: "twitter:title" }).setAttribute(
      "content",
      document.title,
    );
    ensureMeta('meta[property="og:url"]', { property: "og:url" }).setAttribute(
      "content",
      canonicalUrl,
    );
    ensureMeta('meta[name="robots"]', { name: "robots" }).setAttribute(
      "content",
      noIndex ? "noindex, nofollow" : "index, follow",
    );

    ensureLink("canonical").setAttribute("href", canonicalUrl);
  }, [canonicalPath, description, location.pathname, location.search, noIndex, title]);

  return null;
}
