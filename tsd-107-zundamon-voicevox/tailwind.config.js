/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        zundamon: {
          green: '#90EE90',
          dark: '#228B22',
          light: '#E0FFE0',
        },
      },
    },
  },
  plugins: [],
}