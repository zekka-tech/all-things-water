import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Cloudflare Pages turns a rewrite of a fixed path to /index.html (e.g.
// "/shop /index.html 200") into a 308 redirect to "/", so direct links and
// refreshes on those pages landed on the home page. Only the catch-all
// rewrite is safe; it already covers every client-side route.
describe("public/_redirects", () => {
  const rules = readFileSync(resolve(__dirname, "../../public/_redirects"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  it("has a catch-all SPA rewrite", () => {
    expect(rules).toContain("/* /index.html 200");
  });

  it("does not rewrite individual paths to /index.html", () => {
    const fixedPathRewrites = rules.filter((r) => {
      const [from, to] = r.split(/\s+/);
      return to === "/index.html" && !from.includes("*");
    });
    expect(fixedPathRewrites).toEqual([]);
  });
});
