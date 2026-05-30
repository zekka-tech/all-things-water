import { useEffect } from "react";

interface Props {
  title: string;
  description?: string;
}

/** Minimal document-head manager — keeps title & meta description in sync per page. */
export function Seo({ title, description }: Props) {
  useEffect(() => {
    document.title = `${title} · All Things Water`;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
  return null;
}
