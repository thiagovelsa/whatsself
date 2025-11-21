/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#22c55e',
          primaryHover: '#16a34a',
          accent: '#f97316',
          surface: '#111315',
          surfaceAlt: '#14171a',
          surfaceElevated: '#1b1f24',
          border: '#2a2f37',
          muted: '#9ca3af',
          text: '#f3f4f6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#f43f5e',
          info: '#38bdf8',
        },
      },
      boxShadow: {
        'brand-card': '0 24px 48px -32px rgba(34, 197, 94, 0.45)',
        'brand-soft': '0 20px 40px -24px rgba(15, 23, 42, 0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
