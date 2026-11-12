import { OptimizedImage } from "./OptimizedImage";
import { TiltCard } from "./TiltCard";
import { WaterSurface } from "./WaterSurface";
import { BubbleField } from "./BubbleField";

interface Product3DPanelProps {
  src: string;
  alt: string;
}

/**
 * Floats the product on a lit stage inside a water scene. The stage stays light
 * in both themes and the image multiplies onto it, because the catalogue photos
 * are shot on white rather than cut out — on a dark or tinted backdrop they
 * would show as white rectangles.
 */
export function Product3DPanel({ src, alt }: Product3DPanelProps) {
  return (
    <div className="card relative aspect-square overflow-hidden bg-linear-to-b from-brand-50 via-brand-50/40 to-white dark:from-ink-800 dark:via-ink-800/60 dark:to-ink-900">
      <div aria-hidden className="caustic-bg absolute inset-0" />

      <BubbleField className="opacity-70" />

      <TiltCard
        max={9}
        className="absolute inset-0 grid place-items-center p-8 sm:p-10"
      >
        {/* Opaque, so the multiply blend resolves against one flat colour and
            leaves no seam where the photo's white background ends. */}
        <div className="animate-bob isolate w-full rounded-3xl bg-white p-6 shadow-depth-2">
          <OptimizedImage
            src={src}
            alt={alt}
            loading="eager"
            wrapperClassName="bg-transparent"
            className="mx-auto max-h-[320px] w-full object-contain mix-blend-multiply"
          />
        </div>
      </TiltCard>

      {/* Contact shadow sits outside the tilt layer so it stays grounded. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-12 left-1/2 h-5 w-2/5 -translate-x-1/2 rounded-full bg-ink-900/15 blur-xl dark:bg-black/40"
      />

      <WaterSurface className="bottom-0 h-16 opacity-60" />
    </div>
  );
}
