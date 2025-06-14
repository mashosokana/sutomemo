// tailwind.config.js
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
        background: "var(--background)",
        foreground: "var(--foreground)",

        primary:  "#000000",   // 黒ベタボタン & 見出し
        accent:   "#1E90FF",   // ダウンロードなど青
        ivory:    "#FFF4E2",
        card:     "#FFFFFF",   // 投稿カード背景
      },
      
      fontFamily: {
       sans: ['"Noto Sans JP"', "Inter", "sans-serif"],
      },
      
      maxWidth: {
        phone: "375px",        // スマホ幅固定
      },
      
      borderRadius: {
        md: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
        
    
      
