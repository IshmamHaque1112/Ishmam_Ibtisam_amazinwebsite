/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amazon: {
          orange: '#FF9900',
          dark: '#232F3E',
          light: '#37475A',
          blue: '#007185',
          yellow: '#F0C14B'
        }
      }
    },
  },
  plugins: [],
}
