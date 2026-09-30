/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        biokraft: {
          bg: '#F7F7F2',
          surface: '#FFFFFF',
          text: '#111111',
          muted: '#64645F',
          border: '#DEDED8',
          accent: '#718B6B',
          deep: '#324C3A',
          light: '#E8EFE5',
          amber: '#B47832',
          red: '#9E3B3B',
        },
        brand: {
          50: '#f0fdfa',
          100: '#e8efe5',
          200: '#cbd5e1',
          300: '#718b6b',
          400: '#52704d',
          500: '#324c3a',
          600: '#273c2e',
          700: '#1d2c22',
          800: '#152019',
          900: '#0d1410',
          950: '#060a08',
        },
      },
      borderRadius: {
        DEFAULT: '2px',
        none: '0px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'Manrope', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
