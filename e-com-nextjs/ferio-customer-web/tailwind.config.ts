import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        ink2: "rgb(var(--color-ink2) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
      letterSpacing: {
        eyebrow: "0.12em",
      },
    },
  },
  plugins: [],
};
export default config;
