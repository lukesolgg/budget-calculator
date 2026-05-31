/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f17",
        panel: "#111722",
        panel2: "#161d2b",
        border: "#232c3d",
        ink: "#f4efe6",
        muted: "#8b97a8",
        accent: "#2fe6a6",
        accentDeep: "#12b886",
        good: "#4ade80",
        warn: "#f0b86a",
        bad: "#f87171",
        track: "#1b2230",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(.98)" },
          "100%": { opacity: "1", transform: "none" },
        },
        glow: {
          "0%,100%": { boxShadow: "0 0 0 1px #1c2b24, 0 0 24px -8px #2fe6a6" },
          "50%": { boxShadow: "0 0 0 1px #2fe6a6, 0 0 40px -6px #2fe6a6" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        pop: "pop .35s ease",
        glow: "glow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        fadeUp: "fadeUp .6s ease both",
      },
    },
  },
  plugins: [],
};
