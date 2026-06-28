import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { turnstileSiteKey: "" as string },
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { Turnstile } from "./Turnstile";
import { turnstileEnabled } from "@/lib/turnstile";

afterEach(() => {
  cleanup();
  mockEnv.turnstileSiteKey = "";
});

describe("Turnstile", () => {
  it("renders nothing and is disabled when no site key is configured", () => {
    const { container } = render(<Turnstile onVerify={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(turnstileEnabled()).toBe(false);
  });

  it("renders a mount point and reports enabled when a site key is configured", () => {
    mockEnv.turnstileSiteKey = "1x00000000000000000000AA";
    const { container } = render(<Turnstile onVerify={vi.fn()} />);
    expect(container.querySelector("div")).not.toBeNull();
    expect(turnstileEnabled()).toBe(true);
  });
});
