/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Assessment module palette
        brand: { DEFAULT: '#E8450A', dark: '#C63A07', light: '#FDE3D6' },
        gold: { DEFAULT: '#C8963E' },
        cream: { DEFAULT: '#FDF0E6' },
        ink: { DEFAULT: '#1F1A17', soft: '#5B524B' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        assess: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gradient': 'gradient 3s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        pulseWarn: 'pulseWarn 1s ease-in-out infinite',
        pop: 'pop .15s ease-out',
      },
      keyframes: {
        pulseWarn: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.55' } },
        pop: { '0%': { transform: 'scale(.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}