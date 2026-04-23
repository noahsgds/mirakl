/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#1B3A5C',
        accent: '#E8445A',
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#1A1A2E',
        muted: '#6B7280',
        ink: {
          50:  '#F4F6FA',
          100: '#E6EBF3',
          200: '#C6D1E1',
          300: '#9CADC5',
          400: '#6B80A0',
          500: '#425A7E',
          600: '#2E4567',
          700: '#233853',
          800: '#1B3A5C',
          900: '#12243A',
          950: '#0A1726',
        },
        crimson: {
          50:  '#FDF2F4',
          100: '#FCE4E8',
          200: '#F8C0C9',
          300: '#F192A1',
          400: '#ED6478',
          500: '#E8445A',
          600: '#CF2B43',
          700: '#A81F34',
          800: '#7E1625',
          900: '#4F0E18',
        },
      },
      fontFamily: {
        sans:    ['"Geist"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Fraunces"', '"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      letterSpacing: {
        'tightest': '-0.04em',
      },
      boxShadow: {
        'soft':     '0 1px 2px 0 rgba(27, 58, 92, 0.04), 0 1px 3px 0 rgba(27, 58, 92, 0.06)',
        'lifted':   '0 1px 2px rgba(27, 58, 92, 0.04), 0 8px 24px -8px rgba(27, 58, 92, 0.12)',
        'elevated': '0 4px 12px -2px rgba(27, 58, 92, 0.08), 0 16px 40px -12px rgba(27, 58, 92, 0.18)',
        'crimson':  '0 10px 30px -10px rgba(232, 68, 90, 0.45)',
        'ring-ink': '0 0 0 1px rgba(27, 58, 92, 0.08)',
        'inset-hi': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      backgroundImage: {
        'grain':      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        'dots':       "radial-gradient(circle, rgba(27, 58, 92, 0.08) 1px, transparent 1px)",
        'sidebar-gradient': "linear-gradient(180deg, #1B3A5C 0%, #12253F 60%, #0D1B30 100%)",
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in':  'fade-in 0.4s ease-out both',
        'shimmer':  'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
