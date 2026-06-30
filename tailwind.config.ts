import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"]
      },
      colors: {
        blackYu: "#0D0D0D",
        graphite: "#2A2A2A",
        mid: "#6B6B6B",
        faint: "#ABABAB",
        gold: "#C9A96E",
        goldPale: "#F0E8D8",
        cream: "#F7F4EF",
        paper: "#FFFFFF"
      }
    }
  },
  plugins: []
};

export default config;
