/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo primary
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          cyan: '#06b6d4',
          violet: '#8b5cf6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bengali: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
      },
      borderRadius: {
        'card': '1.25rem', // 20px
        'card-lg': '1.5rem', // 24px
      },
      boxShadow: {
        'soft': '0 4px 24px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
        'soft-hover': '0 10px 30px -4px rgba(99, 102, 241, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}

