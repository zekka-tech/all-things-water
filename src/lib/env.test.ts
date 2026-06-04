import { describe, it, expect } from "vitest";
import { env } from "./env";

describe("env", () => {
  // With no VITE_ vars set, all env values fall back to defaults
  // or empty strings.

  it("exports an object with expected keys", () => {
    expect(env).toHaveProperty("analyticsEnabled");
    expect(env).toHaveProperty("contactFormEndpoint");
    expect(env).toHaveProperty("newsletterEndpoint");
    expect(env).toHaveProperty("whatsappNumber");
    expect(env).toHaveProperty("companyEmail");
    expect(env).toHaveProperty("companyPhone");
    expect(env).toHaveProperty("companyAddress");
  });

  it("analyticsEnabled defaults to false when VITE_ANALYTICS_ENABLED is not set", () => {
    expect(env.analyticsEnabled).toBe(false);
  });

  it("contactFormEndpoint defaults to empty string", () => {
    expect(env.contactFormEndpoint).toBe("");
  });

  it("newsletterEndpoint defaults to empty string", () => {
    expect(env.newsletterEndpoint).toBe("");
  });

  it("whatsappNumber defaults to empty string", () => {
    expect(env.whatsappNumber).toBe("");
  });

  it("companyEmail falls back to default value", () => {
    // Without VITE_COMPANY_EMAIL, the || fallback kicks in
    expect(env.companyEmail).toBe("info@allthingswater.co.za");
  });

  it("companyPhone defaults to empty string", () => {
    expect(env.companyPhone).toBe("");
  });

  it("companyAddress defaults to empty string", () => {
    expect(env.companyAddress).toBe("");
  });
});
