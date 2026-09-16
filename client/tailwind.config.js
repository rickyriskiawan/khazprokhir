/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          light: "#f1f3f7",
          dark: "#090b0e",
        },
        surface: {
          light: "#ffffff",
          dark: "#12151c",
          subtleLight: "#f8f9fb",
          subtleDark: "#1a1f29",
        },
        border: {
          light: "#e8ebf1",
          dark: "#1e2430",
        },
        pitch: {
          light: "#0f1115",
          dark: "#ffffff",
          card: "#0b0c10",
          cardDark: "#1e232f",
        },
        emerald: {
          main: "#10b981",
          surface: "#ecfdf5",
          text: "#059669",
          surfaceDark: "rgba(16, 185, 129, 0.12)",
          textDark: "#6ee7b7",
        },
      },
      borderRadius: {
        "3xl": "1.5rem", // 24px
        "2xl": "1.25rem", // 20px
      },
      boxShadow: {
        "soft-card": "0 10px 30px -8px rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.02)",
        "soft-card-dark": "0 10px 30px -8px rgba(0, 0, 0, 0.4)",
        "floating-tooltip": "0 14px 34px -6px rgba(0, 0, 0, 0.08)",
        "floating-tooltip-dark": "0 14px 34px -6px rgba(0, 0, 0, 0.6)",
        "active-row": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        "active-row-dark": "0 4px 20px -2px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
}
