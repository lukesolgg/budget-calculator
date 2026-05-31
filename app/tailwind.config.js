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
        accent: "#4ea8ff",
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
          "0%,100%": { boxShadow: "0 0 0 1px #232c3d, 0 0 22px -8px #4ea8ff" },
          "50%": { boxShadow: "0 0 0 1px #4ea8ff, 0 0 34px -6px #4ea8ff" },
        },
      },
      animation: {
        pop: "pop .35s ease",
        glow: "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
