/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        high:  { DEFAULT: '#e74c3c', light: '#fdecea' },
        mid:   { DEFAULT: '#2980b9', light: '#eaf4fb' },
        small: { DEFAULT: '#27ae60', light: '#eafaf1' },
      },
    },
  },
  plugins: [],
};
