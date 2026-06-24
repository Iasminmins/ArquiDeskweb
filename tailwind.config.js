/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15201d",
        moss: "#47624f",
        clay: "#b8664b",
        fog: "#f3f5f0",
        line: "#dce2d5"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(22, 33, 28, 0.08)"
      }
    },
  },
  plugins: [],
};
