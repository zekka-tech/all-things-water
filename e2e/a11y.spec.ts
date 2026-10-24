import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility gate. Scans the primary storefront routes with axe-core and
 * fails on serious/critical WCAG 2 A/AA violations. Run on chromium only.
 */
const ROUTES = ["/", "/shop", "/about", "/contact", "/cart"];

test.describe("accessibility (axe)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "axe runs on chromium");

  for (const route of ROUTES) {
    test(`no serious/critical a11y violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // Let entrance animations (fade-in etc.) finish so axe doesn't sample
      // half-transparent text. Infinite animations (ripple) are skipped.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        ),
      );

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      // Surface a readable summary on failure.
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
        .join("\n");

      expect(blocking, `Accessibility violations on ${route}:\n${summary}`).toEqual([]);
    });
  }
});
