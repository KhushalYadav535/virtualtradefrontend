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
          bg: '#f5f7fa',
          'bg-soft': '#fafbfc',
          surface: '#ffffff',
          'surface-2': '#f9fafb',
          primary: '#00b386',
          'primary-dark': '#009973',
          'primary-darker': '#007a5c',
          'primary-light': '#e6f7f2',
          'primary-soft': '#f0faf6',
          'primary-muted': '#b8ebe0',
          ink: '#1a1d29',
          'ink-secondary': '#44475b',
          muted: '#7c7e8c',
          'muted-soft': '#a3a5b3',
          border: '#eef0f3',
          'border-strong': '#dadde2',
          profit: '#00b386',
          'profit-soft': '#e6f7f2',
          loss: '#eb4b4b',
          'loss-soft': '#fdecec',
          warning: '#f59e0b',
          'warning-soft': '#fef4e2'
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
        dark: '#1a1d29'
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'Inter', 'system-ui', 'sans-serif'],
        num: ['var(--font-dm-sans)', 'Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs': ['11px', { lineHeight: '16px' }],
      },
      boxShadow: {
        'groww-xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        groww: '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.04)',
        'groww-md': '0 2px 4px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.06)',
        'groww-lg': '0 4px 12px rgba(15, 23, 42, 0.06), 0 20px 40px rgba(15, 23, 42, 0.08)',
        'groww-glow': '0 0 0 1px rgba(0, 179, 134, 0.2), 0 4px 24px rgba(0, 179, 134, 0.15)',
        'groww-inner': 'inset 0 1px 2px rgba(15, 23, 42, 0.04)'
      },
      borderRadius: {
        groww: '12px',
        'groww-lg': '16px',
        'groww-xl': '20px'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.5s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'price-flash-up': 'priceFlashUp 0.6s ease-out',
        'price-flash-down': 'priceFlashDown 0.6s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        priceFlashUp: {
          '0%': { backgroundColor: 'rgba(0, 179, 134, 0.18)' },
          '100%': { backgroundColor: 'transparent' }
        },
        priceFlashDown: {
          '0%': { backgroundColor: 'rgba(235, 75, 75, 0.18)' },
          '100%': { backgroundColor: 'transparent' }
        }
      }
    }
  },
  plugins: []
};
