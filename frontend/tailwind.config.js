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
        bank: {
          dark: '#030712',
          card: '#080d1a',
          cardHover: '#0d1527',
          border: '#172238',
          borderHover: '#233252',
          header: '#071022',
          blue: '#2563eb',
          blueGlow: '#3b82f6',
          amber: '#f59e0b',
          green: '#10b981',
          textMuted: '#94a3b8',
          textLight: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}

