/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9ff",
          100: "#dff2ff",
          200: "#b8e7ff",
          300: "#78d4ff",
          400: "#32bdff",
          500: "#06a3f0",
          600: "#0082cd",
          700: "#0067a6",
          800: "#055789",
          900: "#0a4971",
          950: "#072e4b",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae2",
          300: "#b0bac9",
          400: "#8595aa",
          500: "#66778f",
          600: "#516076",
          700: "#424e60",
          800: "#394251",
          900: "#1f2630",
          950: "#13181f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-brand": "0 0 32px -4px rgba(6, 163, 240, 0.35)",
        "glow-sm": "0 0 16px -2px rgba(6, 163, 240, 0.2)",
        "card-hover": "0 8px 30px -4px rgba(31, 38, 48, 0.12)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #06a3f0 0%, #0067a6 100%)",
        "hero-gradient": "radial-gradient(ellipse 80% 60% at 50% -10%, #dff2ff 0%, transparent 70%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        ripple: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-once": {
          "0%, 100%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.35)" },
          "60%": { transform: "scale(0.9)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "fade-in-delay": "fade-in 0.5s 0.15s ease-out both",
        "slide-up": "slide-up 0.35s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
        ripple: "ripple 2.6s ease-out infinite",
        "bounce-once": "bounce-once 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
