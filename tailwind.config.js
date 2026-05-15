/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D0E12',
        'bg-secondary': '#16181E',
        'bg-tertiary': '#1E2029',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8B8D97',
        'accent-green': '#00C853',
        'accent-red': '#FF1744',
        'accent-blue': '#2196F3',
        'accent-yellow': '#FFD600',
        border: '#2A2D3A',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
