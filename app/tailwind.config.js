/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'hard': '4px 4px 0 0 rgba(0,0,0,1)',
        'hard-sm': '2px 2px 0 0 rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}
