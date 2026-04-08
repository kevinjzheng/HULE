/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'table-green': '#2d6a4f',
        'table-felt': '#1b4332',
        'tile-bg': '#f5f0e8',
        'tile-border': '#c9b99a',
        'tile-man': '#c0392b',
        'tile-pin': '#2980b9',
        'tile-sou': '#27ae60',
        'tile-honor': '#8e44ad',
        'tile-bonus': '#e67e22',
      },
      fontFamily: {
        mahjong: ['Georgia', 'serif'],
      },
      boxShadow: {
        tile: '2px 3px 6px rgba(0,0,0,0.4)',
        'tile-hover': '3px 5px 10px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'tile-draw': {
          '0%': { transform: 'translateY(-20px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'win-flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'eligible-pulse': {
          '0%, 100%': { boxShadow: '0 0 6px 2px rgba(251,191,36,0.35)' },
          '50%': { boxShadow: '0 0 18px 5px rgba(251,191,36,0.85)' },
        },
      },
      animation: {
        'tile-draw': 'tile-draw 0.3s ease-out',
        'win-flash': 'win-flash 0.6s ease-in-out 3',
        'eligible-pulse': 'eligible-pulse 2s ease-in-out infinite',
      },
      screens: {
        // Tablet landscape: wide enough to trigger lg, but vertical space is limited.
        // Defined after lg so it wins when both match (same-width tablet in landscape).
        'tablet-land': { raw: '(orientation: landscape) and (min-width: 1024px) and (max-width: 1180px) and (max-height: 900px)' },
      },
    },
  },
  plugins: [],
}
