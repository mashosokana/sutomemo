// tailwind.config.ts
import type { Config } from "tailwindcss";
import lineClamp from "@tailwindcss/line-clamp"; 

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#000000",
        accent: "#1E90FF",
        ivory: "#FFF4E2",
        card: "#FFFFFF",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
      },
      maxWidth: {
        phone: "375px",
      },
      borderRadius: {
        md: "4px",
      },
    },
  },
  plugins: [
    lineClamp, 
  ],
};

export default config;
