import type { Config } from "tailwindcss";

// Tokens from design-tokens.md. Components use these classes, never raw colors.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0E9F8E", dark: "#0B4F6C", soft: "#E6F4F1" },
        warning: { DEFAULT: "#F5A524", soft: "#FFF3DC", text: "#B7791F" },
        danger: { DEFAULT: "#D93036" },
        success: { DEFAULT: "#22C55E", bright: "#4ADE80", soft: "#E3F6EC", text: "#15803D" },
        info: { soft: "#E0EEFF", text: "#2F6FD6" },
        purple: { soft: "#EFE7FF", text: "#6D28D9" },
        bg: "#F5F7FA",
        surface: { DEFAULT: "#FFFFFF", muted: "#EEF1F5" },
        line: "#E4E9F0",
        ink: { DEFAULT: "#0F1B2D", secondary: "#6B7A90", muted: "#9FB0C7" },
        icon: "#9AA7B8",
        night: { bg: "#0F1B2D", surface: "#17263D", surface2: "#23324A", line: "#33445E" },

        // LEGACY, remove in Tahap 4: old class names still used by screens not
        // rebuilt yet, pointed at the new palette so nothing renders off-brand.
        accent: { DEFAULT: "#0E9F8E", strong: "#0B4F6C", soft: "#E6F4F1", light: "#0E9F8E" },
        good: { DEFAULT: "#22C55E", soft: "#E3F6EC", text: "#15803D", strong: "#15803D" },
        warn: { DEFAULT: "#F5A524", soft: "#FFF3DC", text: "#B7791F", strong: "#B7791F" },
        critical: { DEFAULT: "#D93036", soft: "rgb(217 48 54 / 0.1)", text: "#D93036", strong: "#D93036" },
        sim: { DEFAULT: "#6D28D9", soft: "#EFE7FF", text: "#6D28D9", strong: "#6D28D9" },
        "surface-sunken": "#EEF1F5",
        border: "#E4E9F0",
        "ink-soft": "#6B7A90",
        "ink-faint": "#9FB0C7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        bar: "3px",
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "24px",
        xl2: "18px", // LEGACY
      },
      boxShadow: {
        card: "0 6px 18px rgba(15, 28, 46, 0.08)",
        nav: "0 -4px 16px rgba(15, 28, 46, 0.06)",
      },
      backgroundImage: {
        header: "linear-gradient(135deg, #0B4F6C 0%, #0E9F8E 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
