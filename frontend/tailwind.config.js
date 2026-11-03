/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zerodha: {
          blue: "#387ed1",
          orange: "#ff5722",
          dark: "#1c1c1c",
          gray: "#f6f7fb"
        }
      }
    },
  },
  plugins: [],
};