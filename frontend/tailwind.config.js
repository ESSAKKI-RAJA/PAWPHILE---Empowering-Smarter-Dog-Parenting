/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Manrope', 'Nunito', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#102A2E',
          800: '#24474A',
        },
        teal: {
          700: '#176B68',
          600: '#23837C',
          100: '#D8F0E8',
          50: '#F0FAF6',
        },
        ivory: {
          50: '#FCFBF7',
          100: '#F6F3EC',
        },
        line: {
          200: '#E3E7E1',
        },
        muted: {
          600: '#637577',
          400: '#8C9A98',
        },
        coral: {
          500: '#E9826E',
          100: '#FDE5DD',
        },
        lavender: {
          600: '#6E6BA8',
          100: '#ECEBFA',
        },
        safety: {
          green: { primary: '#2F8F68', light: '#E6F5ED', border: '#1E694C' },
          yellow: { primary: '#C88916', light: '#FFF4D8', border: '#8A5A08' },
          red: { primary: '#C74646', light: '#FCE7E7', border: '#8E2525' },
          blue: { primary: '#3478A5', light: '#E7F2FA', border: '#235A7B' },
        },
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'emphasis': 'slideUpEmphasis 0.35s ease-in-out',
        'guided': 'fadeInGuided 0.6s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUpEmphasis: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeInGuided: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
    },
  },
  plugins: [],
};
