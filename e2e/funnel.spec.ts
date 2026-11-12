import { test, expect } from "@playwright/test";

/**
 * Purchase-funnel smoke test: browse → product → add to cart → cart →
 * checkout form. Stops before the PayFast redirect, which needs live
 * Supabase + PayFast sandbox credentials (run separately with secrets).
 */
test.describe("storefront purchase funnel", () => {
  test("home renders and links into the shop", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/water/i);
    await page.goto("/shop");
    // At least one product card with an Add control should be present.
    await expect(page.getByRole("button", { name: /add|sold out/i }).first()).toBeVisible();
  });

  test("add to cart updates the cart and reaches checkout", async ({ page }) => {
    await page.goto("/shop");

    const addButton = page.getByRole("button", { name: /^add$/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Cart page should show a line item and a path to checkout.
    await page.goto("/cart");
    const checkout = page.getByRole("link", { name: /checkout/i });
    await expect(checkout).toBeVisible();
    await checkout.click();

    await expect(page).toHaveURL(/\/checkout/);
    // Checkout collects customer details — there must be form fields.
    await expect(page.locator("input").first()).toBeVisible();
  });

  test("direct product page loads and can add to cart", async ({ page }) => {
    await page.goto("/shop");
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("button", { name: /add to cart|add|sold out/i }).first()).toBeVisible();
  });

  test("the planner adds a whole setup to the cart", async ({ page }) => {
    // Keep the consent banner from covering the planner's controls.
    await page.addInitScript(() => localStorage.setItem("atw.cookie-consent", "declined"));
    await page.goto("/water#planner");
    const planner = page.locator("#planner");
    // The radios are visually hidden inside their chips; click the chip.
    await planner.locator("label", { hasText: /from a cooler/i }).click();
    await expect(planner.getByRole("radio", { name: /from a cooler/i })).toBeChecked();
    await planner.getByRole("button", { name: /add setup to cart/i }).click();

    // The cart icon's label carries the item count.
    await expect(page.getByRole("link", { name: /cart.*[1-9]/i }).first()).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /checkout/i })).toBeVisible();
  });
});
