/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px'
    },
    extend: {
      colors: {
        saffron: '#FF9933',
        navy: {
          DEFAULT: '#0B3C6F',
          dark: '#082A4D',
          light: '#1E5A96'
        },
        indiaGreen: '#138808'
      },
      fontFamily: {
        sans: ['Noto Sans', 'Segoe UI', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
