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
      },
    },
  },
  plugins: [],
}
