/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core brand
        brand: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dark: '#4A3DB5',
        },
        // Rank colors
        rank: {
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#FFD700',
          platinum: '#E5E4E2',
          diamond: '#B9F2FF',
          champion: '#FF6B6B',
        },
        // Surface (dark-first)
        surface: {
          DEFAULT: '#1A1A2E',
          raised: '#222240',
          overlay: '#2A2A4A',
          border: '#3A3A5C',
        },
        // Semantic
        success: '#00D68F',
        warning: '#FFAA00',
        danger: '#FF3D71',
        info: '#0095FF',
      },
      fontFamily: {
        sans: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
