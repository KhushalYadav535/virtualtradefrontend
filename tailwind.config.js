/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        groww: {
          bg: '#f6f7f9',
          surface: '#ffffff',
          primary: '#00b386',
          'primary-dark': '#009973',
          'primary-light': '#e6f7f2',
          'primary-muted': '#b8ebe0',
          ink: '#44475b',
          muted: '#7c7e8c',
          border: '#ebedf0',
          profit: '#00b386',
          loss: '#eb4b4b'
        },
        primary: {
          50: '#e6f7f2',
          100: '#b8ebe0',
          500: '#00b386',
          600: '#00b386',
          700: '#009973'
        },
        success: '#00b386',
        danger: '#eb4b4b',
        dark: '#44475b'
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        groww: '0 1px 3px rgba(68, 71, 91, 0.06), 0 4px 12px rgba(68, 71, 91, 0.04)',
        'groww-lg': '0 4px 24px rgba(68, 71, 91, 0.08)'
      },
      borderRadius: {
        groww: '12px',
        'groww-lg': '16px'
      }
    }
  },
  plugins: []
};
