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
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#1A3263',
        'brand-secondary': '#FAB95B',
        'brand-accent': '#FAB95B',
        'brand-light': '#FFFFFF',
        lumina: {
          primary: '#5300B7',
          'primary-light': '#6D28D9',
          'primary-soft': '#EBDDFF',
          secondary: '#006591',
          'secondary-light': '#39B8FD',
          surface: '#FCF8FF',
          'surface-alt': '#F5F3FF',
          'surface-card': '#FFFFFF',
          text: '#181445',
          'text-muted': '#4A4455',
          outline: '#CCC3D7',
        },
        status: {
          available: '#10B981',
          requested: '#3B82F6',
          pending: '#F59E0B',
          overdue: '#EF4444',
        },
      },
      boxShadow: {
        'lumina-sm': '0px 4px 20px rgba(30, 27, 75, 0.05)',
        'lumina-lg': '0px 12px 32px rgba(30, 27, 75, 0.12)',
      },
    },
  },
  plugins: [],
}
