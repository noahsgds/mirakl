/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#07080D',
        surface: '#0D0E18',
        'surface-2': '#131525',
        'surface-3': '#191B2D',
        text: '#E2E5F6',
        'text-2': '#8890B8',
        'text-3': '#4C5180',
        accent: '#FF3358',
        violet: '#7B6FFF',
        teal: '#00E0C0',
        amber: '#FFB020',
        emerald: '#00C97B',
        sidebar: '#05060A',
        muted: '#8890B8',
      },
    },
  },
  plugins: [],
}
