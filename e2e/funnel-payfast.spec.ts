import { test, expect } from "@playwright/test";

/**
 * Full purchase funnel against a REAL backend, ending at the PayFast sandbox
 * redirect. This exercises order creation (orders fn + create_order RPC),
 * token-bound payment initiation, and the signed PayFast redirect end-to-end.
 *
 * Requires the app to be built/served with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * pointing at a Supabase project that has the Edge Functions deployed and
 * PAYFAST_SANDBOX=true. Gated on E2E_PAYFAST=1 so the default suite stays
 * backend-free. Completing payment + ITN is out of scope for headless e2e.
 */
test.describe("full funnel → PayFast sandbox", () => {
  test.skip(!process.env.E2E_PAYFAST, "set E2E_PAYFAST=1 with a configured backend to run");
  // Redirect goes to PayFast (external) — run on chromium only.
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");

  test("places an order and redirects to the PayFast sandbox", async ({ page }) => {
    await page.goto("/shop");

    const addButton = page.getByRole("button", { name: /^add$/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.goto("/checkout");

    await page.getByLabel(/full name/i).fill("E2E Tester");
    await page.getByLabel(/^email$/i).fill("e2e@example.com");
    await page.getByLabel(/phone number/i).fill("0821234567");
    await page.getByLabel(/street address/i).fill("1 Test Street");
    await page.getByLabel(/city \/ town/i).fill("Johannesburg");
    await page.getByLabel(/postal code/i).fill("2000"); // Gauteng metro → deliverable

    const placeOrder = page.getByRole("button", { name: /place order/i });
    // Wait for postal validation to enable the button.
    await expect(placeOrder).toBeEnabled({ timeout: 15_000 });
    await placeOrder.click();

    // The app sets window.location to the signed PayFast process URL.
    await page.waitForURL(/sandbox\.payfast\.co\.za\/eng\/process/, { timeout: 30_000 });
    expect(page.url()).toContain("merchant_id");
    expect(page.url()).toContain("signature");
  });
});
