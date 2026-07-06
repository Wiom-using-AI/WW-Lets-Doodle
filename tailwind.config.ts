import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ["var(--font-gaegu)", "Comic Sans MS", "cursive"],
        body: ["var(--font-fredoka)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#2b2b3a",
        paper: "#fdf7e9",
        crayon: {
          red: "#ff5d5d",
          orange: "#ff9f43",
          yellow: "#ffd23f",
          green: "#3ec96b",
          blue: "#4d9de0",
          purple: "#9b5de5",
          pink: "#ff70a6",
        },
      },
      boxShadow: {
        doodle: "3px 3px 0 #2b2b3a",
        "doodle-lg": "5px 5px 0 #2b2b3a",
        "doodle-sm": "2px 2px 0 #2b2b3a",
      },
      rotate: {
        "1.5": "1.5deg",
        "-1.5": "-1.5deg",
      },
    },
  },
  plugins: [],
};
export default config;
