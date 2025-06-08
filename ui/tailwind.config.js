/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          600: '#4f46e5', // Indigo 600
        },
        success: {
          500: '#10b981', // Emerald 500
        },
        warning: {
          500: '#f59e0b', // Amber 500
        },
        text: {
          800: '#1e293b', // Slate 800
        },
        card: {
          100: '#f1f5f9', // Slate 100
        }
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
      },
      gap: {
        'gutter': '1rem',
      },
      width: {
        '18': '72px',
      },
      margin: {
        '18': '72px',
      }
    },
  },
  plugins: [],
}

