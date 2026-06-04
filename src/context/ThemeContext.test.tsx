import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

beforeEach(() => {
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ThemeContext", () => {
  describe("initial theme", () => {
    it("defaults to light theme when no preference is stored and no system preference", () => {
      // matchMedia is mocked in setup.ts to return matches: false (light)
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe("light");
    });

    it("respects stored theme from localStorage", () => {
      localStorage.setItem("atw.theme", "dark");
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe("dark");
    });

    it("ignores invalid values in localStorage", () => {
      localStorage.setItem("atw.theme", "invalid");
      const { result } = renderHook(() => useTheme(), { wrapper });
      // Falls back to light (system preference mock returns false for dark mode)
      expect(result.current.theme).toBe("light");
    });
  });

  describe("toggle", () => {
    it("toggles from light to dark", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("dark");
    });

    it("toggles from dark to light", () => {
      localStorage.setItem("atw.theme", "dark");
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("light");
    });

    it("persists the toggled theme to localStorage", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem("atw.theme")).toBe("dark");

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem("atw.theme")).toBe("light");
    });
  });

  describe("DOM class toggling", () => {
    it('adds "dark" class to documentElement when theme is dark', () => {
      localStorage.setItem("atw.theme", "dark");
      renderHook(() => useTheme(), { wrapper });

      // Wait for the useEffect to run
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it('removes "dark" class from documentElement when theme is light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggle(); // light → dark
      });
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      act(() => {
        result.current.toggle(); // dark → light
      });
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("error handling", () => {
    it("throws when useTheme is used outside ThemeProvider", () => {
      let error: Error | null = null;
      try {
        renderHook(() => useTheme());
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toContain("useTheme must be used within a ThemeProvider");
    });
  });
});
