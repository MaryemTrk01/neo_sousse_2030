/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkNavy: '#0B1120',
        cyanAccent: '#00F0FF',
        cardDark: '#1E293B',
      }
    },
  },
  plugins: [],
}
