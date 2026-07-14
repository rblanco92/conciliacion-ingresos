import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          orange: "#F27730",
          black: "#161819",
          white: "#F3F3F3",
          violet: "#3649A9",
          gold: "#B38B47",
        },
        ok: "#2E9E5B",
        warn: "#E0A93B",
        err: "#D1495B",
      },
      fontFamily: {
        display: ["Coolvetica", "Bebas Neue", "Impact", "sans-serif"],
        body: ["Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
