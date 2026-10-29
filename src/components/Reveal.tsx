import type { HTMLAttributes } from "react";
import { cx } from "@/lib/format";
import { useReveal } from "@/lib/useReveal";

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Stagger offset in ms, for sibling elements revealing in sequence. */
  delay?: number;
}

export function Reveal({ delay = 0, className, style, children, ...rest }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
      className={cx("reveal", visible && "reveal-visible", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
