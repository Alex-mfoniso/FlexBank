/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f8ff',
          100: '#ebf1ff',
          500: '#6366f1', // Indigo sleek main primary
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        slate: {
          950: '#0b0f19', // Sleek deep slate dark for background details
        }
      },
    },
  },
  plugins: [],
};
