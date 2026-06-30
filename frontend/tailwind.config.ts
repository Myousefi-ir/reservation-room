import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        slot: {
          available: '#16a34a',
          past: '#9ca3af',
          booked: '#dc2626',
          closed: '#d1d5db',
        },
      },
    },
  },
  plugins: [],
};

export default config;
