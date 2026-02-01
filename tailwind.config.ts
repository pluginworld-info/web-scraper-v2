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
        // We define our custom palette here.
        // Now we can use 'bg-header' or 'bg-card-dark' instead of hex codes.
        header: '#555555', 
        'card-dark': '#1e1e1e',
        'card-border': '#2d2d2d',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Ensure you have this installed: npm install -D @tailwindcss/typography
  ],
};
export default config;