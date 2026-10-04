/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#14110D',
        'bg-surface': '#1D1913',
        'bg-raised': '#27211A',
        'border': '#3B3227',
        'text': '#ECE4D3',
        'text-muted': '#B3A78F',
        'primary': '#7DB562',
        'primary-hover': '#93CB78',
        'on-primary': '#14110D',
        'accent': '#E0A93F',
        'danger': '#E0604A',
        'hp-high': '#6CBF5E',
        'hp-mid': '#E0A93F',
        'hp-low': '#E0604A',
        'info': '#5FA8A0',
      },
      fontFamily: {
        'display': ['Pixelify Sans', 'monospace'],
        'body': ['Atkinson Hyperlegible', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
