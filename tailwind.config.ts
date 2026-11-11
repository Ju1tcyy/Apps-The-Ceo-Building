import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#142D4E",
          hover: "#0F233D",
          light: "#1F3E68",
        },
        accent: {
          DEFAULT: "#C6A66B",
          hover: "#B89656",
          light: "#DFCA9C",
          muted: "#EFE6D4",
        },
        background: "#F5F7FA",
        surface: "#FFFFFF",
        appText: {
          DEFAULT: "#172B43",
          muted: "#718096",
          subtle: "#A0AEC0",
        },
        appBorder: {
          DEFAULT: "#E5EAF0",
          subtle: "#EDF2F7",
        },
        status: {
          success: "#16845B",
          warning: "#D69E2E",
          danger: "#C84C4C",
          info: "#3977B8",
        },
      },
      borderRadius: {
        card: "12px",
        control: "8px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
