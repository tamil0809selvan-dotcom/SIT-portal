/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3ff',
          100: '#dfe5ff',
          200: '#b8c4ff',
          300: '#8da0ff',
          400: '#5c73ff',
          500: '#3b4cca',
          600: '#1e3a8a',
          700: '#1a2f6e',
          800: '#152553',
          900: '#0f1b3d',
          950: '#0a1128',
        },
        royal: {
          50: '#eff4ff',
          100: '#dbe6fe',
          200: '#bfcffe',
          300: '#93b0fd',
          400: '#6088fa',
          500: '#3b63f5',
          600: '#2545ea',
          700: '#1d34d7',
          800: '#1e2bae',
          900: '#1e2a89',
          950: '#171c54',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
