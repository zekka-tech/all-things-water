import { cx } from "@/lib/format";
import { useParallax } from "@/lib/useScrollProgress";
import type { Photo } from "@/data/photos";

interface PhotoFrameProps {
  photo: Photo;
  /** Tailwind aspect class for the frame; the image covers it. */
  aspect?: string;
  /** Cover the positioned parent instead of reserving an aspect ratio. */
  fill?: boolean;
  /** `sizes` attribute — how wide the frame renders, for srcset selection. */
  sizes: string;
  className?: string;
  imgClassName?: string;
  parallax?: boolean;
  /** Above the fold: load eagerly instead of lazily. */
  priority?: boolean;
  /** Decorative use (e.g. behind a link that already names the subject). */
  decorative?: boolean;
  children?: React.ReactNode;
}

/**
 * A clipped photo with a reserved aspect ratio, so it never shifts layout
 * while loading (CLS is error-gated). The tinted background shows until the
 * image decodes, in place of a shimmer.
 */
export function PhotoFrame({
  photo,
  aspect = "aspect-[16/10]",
  fill = false,
  sizes,
  className,
  imgClassName,
  parallax = false,
  priority = false,
  decorative = false,
  children,
}: PhotoFrameProps) {
  const ref = useParallax<HTMLImageElement>(parallax ? 0.07 : 0);

  return (
    <div
      className={cx(
        "overflow-hidden bg-brand-100 dark:bg-brand-950",
        fill ? "absolute inset-0" : `relative ${aspect}`,
        className,
      )}
    >
      <img
        ref={parallax ? ref : undefined}
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={decorative ? "" : photo.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cx("absolute inset-0 h-full w-full object-cover", imgClassName)}
      />
      {children}
    </div>
  );
}
