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
        /* ── Mirakl brand palette ── */
        bg:          '#f8faff',
        'bg-light':  '#eff4ff',
        surface:     '#ffffff',
        'surface-2': '#eff4ff',
        'surface-3': '#e4ecf7',
        border:      '#dee3e8',
        'border-strong': '#c4cdd6',

        text:        '#102b49',
        'text-2':    '#3e6289',
        'text-3':    '#6b6d6f',
        muted:       '#6b6d6f',

        accent:      '#2764ff',
        'accent-dark': '#1a4fd6',

        sidebar:     '#102b49',
        primary:     '#102b49',
        'primary-dark': '#03182f',
        'primary-light': '#3e6289',

        grey:        '#b5bfc8',
        'grey-dark': '#30373e',
        'grey-light': '#6b6d6f',
      },
    },
  },
  plugins: [],
}
