const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Depth over the dive: down by 45%, held, then most of the way back up so the
 * water hands over to the white sections below without a hard edge. Shared by
 * the GPU scene and the CSS fallback so both dive the same way.
 */
export function depthFor(progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  return smooth(0.02, 0.45, p) * (1 - 0.88 * smooth(0.72, 1, p));
}
