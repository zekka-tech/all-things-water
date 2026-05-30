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
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ripple: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        ripple: "ripple 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
