/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          650: '#3a3a42',
          750: '#28282e',
          850: '#17171a',
          950: '#09090b',
        },
      },
    },
  },
  plugins: [],
};
