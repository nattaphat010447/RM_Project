/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#1A3263',
        'brand-secondary': '#FAB95B',
        'brand-accent': '#FAB95B',
        'brand-light': '#FFFFFF',
      },
    },
  },
  plugins: [],
}