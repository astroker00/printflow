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
        // Brand palette
        navy: {
          50:  '#f0f4f9',
          100: '#dce6f1',
          200: '#b8cde3',
          300: '#8aaece',
          400: '#5b8bb8',
          500: '#3a6fa3',
          600: '#2d5a8c',
          700: '#1B3A5C', // primary
          800: '#152d48',
          900: '#0d1f33',
          950: '#070f1a',
        },
        amber: {
          50:  '#fff8f0',
          100: '#ffefd6',
          200: '#ffd9a8',
          300: '#ffbd6e',
          400: '#ff9b34',
          500: '#E87722', // accent
          600: '#d06010',
          700: '#ad4b0d',
          800: '#8b3c12',
          900: '#723213',
          950: '#3e1706',
        },
        stone: {
          50:  '#FAFAF9',
          925: '#111110',
        },
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-dm-sans)',   'system-ui', 'sans-serif'],
        mono:    ['var(--font-dm-mono)',   'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft':    '0 2px 24px 0 rgba(27,58,92,0.07)',
        'medium':  '0 4px 40px 0 rgba(27,58,92,0.12)',
        'strong':  '0 8px 60px 0 rgba(27,58,92,0.18)',
        'glow':    '0 0 40px 0 rgba(232,119,34,0.25)',
        'inset-sm':'inset 0 1px 3px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-in':   'slideIn 0.3s ease forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
        'shimmer':    'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(at 40% 20%, rgba(27,58,92,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(232,119,34,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(27,58,92,0.05) 0px, transparent 50%)',
        'shimmer-gradient':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
