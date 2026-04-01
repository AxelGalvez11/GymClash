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
        // Victory Peak surface system (purple-tinted midnight void)
        surface: {
          DEFAULT: '#0c0c1f',
          container: '#17172f',
          'container-low': '#111127',
          'container-high': '#1d1d37',
          'container-highest': '#23233f',
          'container-lowest': '#000000',
          bright: '#292948',
          variant: '#23233f',
          tint: '#ce96ff',
          // Backward compat aliases
          raised: '#17172f',
          overlay: '#1d1d37',
          border: '#46465c',
        },
        // Text
        text: {
          primary: '#e5e3ff',
          secondary: '#aaa8c3',
          muted: '#74738b',
        },
        // Elixir Purple system
        primary: {
          DEFAULT: '#ce96ff',
          dim: '#a434ff',
          fixed: '#c583ff',
          'fixed-dim': '#bb6fff',
          container: '#c583ff',
          'on-primary': '#48007a',
        },
        // Victory Gold system
        secondary: {
          DEFAULT: '#ffd709',
          dim: '#efc900',
          fixed: '#ffd709',
          container: '#705d00',
          'on-secondary': '#5b4b00',
        },
        // Battle Blue system
        tertiary: {
          DEFAULT: '#81ecff',
          dim: '#00d4ec',
          fixed: '#00e3fd',
          container: '#00e3fd',
          'on-tertiary': '#005762',
        },
        // Accent (static fallback — dynamic accent applied via style prop)
        brand: {
          DEFAULT: '#ce96ff',
          light: '#c583ff',
          dark: '#a434ff',
        },
        // Rank colors
        rank: {
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#ffd709',
          platinum: '#E5E4E2',
          diamond: '#81ecff',
          champion: '#ff6e84',
        },
        // Outline (replaces surface-border)
        outline: {
          DEFAULT: '#74738b',
          variant: '#46465c',
        },
        // Semantic
        success: '#10B981',
        warning: '#ffd709',
        danger: '#ff6e84',
        info: '#81ecff',
        error: {
          DEFAULT: '#ff6e84',
          dim: '#d73357',
          container: '#a70138',
        },
      },
      fontFamily: {
        headline: ['Epilogue_700Bold', 'Epilogue_800ExtraBold', 'Epilogue_900Black'],
        body: ['BeVietnamPro_400Regular', 'BeVietnamPro_500Medium', 'BeVietnamPro_600SemiBold', 'BeVietnamPro_700Bold'],
        label: ['Lexend_400Regular', 'Lexend_600SemiBold', 'Lexend_700Bold'],
        sans: ['BeVietnamPro_400Regular'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
      },
    },
  },
  plugins: [],
};
