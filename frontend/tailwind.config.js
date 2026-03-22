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
        primary: '#0f172a',      // slate-900
        'primary-light': '#1e293b', // slate-800
        'primary-lighter': '#334155', // slate-700
        accent: '#3b82f6',       // blue-500
        'accent-dark': '#1e40af', // blue-800
        'accent-light': '#60a5fa', // blue-400
        success: '#10b981',      // emerald-500
        'success-light': '#d1fae5', // emerald-100
        danger: '#ef4444',       // red-500
        'danger-light': '#fee2e2', // red-100
        'bg-primary': '#f8fafc', // slate-50
        'bg-secondary': '#ffffff', // white
        'border-light': '#e2e8f0', // slate-200
        'text-primary': '#1e293b', // slate-800
        'text-secondary': '#64748b', // slate-500
      },
    },
  },
  plugins: [],
}