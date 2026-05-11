/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce6ff',
          500: '#3b5bdb',
          600: '#2f4ac4',
          700: '#243aab',
          900: '#1a2a7a',
        },
      },
    },
  },
  plugins: [],
}
