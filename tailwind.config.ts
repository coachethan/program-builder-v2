import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled directly from the hypertrophytracker.com builder reference screenshots.
        bg: "#0B0E14",
        panel: "#141821",
        "panel-2": "#102927", // success/emerald-tinted banner background
        border: "#39414F",
        "border-soft": "#1E232E",
        ink: "#F1F3F7", // headings
        "ink-2": "#E6E8EC", // body/data text
        muted: "#94A3B8", // secondary/label text
        emerald: {
          DEFAULT: "#10B981",
          fill: "#059669", // solid button fill
          bright: "#34D399" // icons, dots, active borders
        },
        amber: "#C17D3E"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"]
      },
      borderRadius: {
        card: "16px",
        control: "10px"
      }
    }
  },
  plugins: []
};

export default config;

