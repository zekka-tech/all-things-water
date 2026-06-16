import { useState } from "react";
import type { ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
  fallback?: string;
}

export function OptimizedImage({
  src,
  webpSrc,
  alt = "",
  className = "",
  fallback,
  ...rest
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const displaySrc = error && fallback ? fallback : src;

  return (
    <div className="relative overflow-hidden bg-ink-100 dark:bg-ink-800">
      {!loaded && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
      {webpSrc ? (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            src={displaySrc}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
            {...rest}
          />
        </picture>
      ) : (
        <img
          src={displaySrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
          {...rest}
        />
      )}
    </div>
  );
}
