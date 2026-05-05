import type { Config } from "tailwindcss";

export default {
  content: ["./src/apps/ui/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: "#fbfbfa",
          panel: "#f7f6f3",
          page: "#ffffff",
          text: "#2f3437",
          muted: "#6b6f76",
          line: "#e6e4df",
          strongLine: "#d8d5cf",
          hover: "#f1f1ef",
          tag: "#e9e7e2",
          red: "#c23b22",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
