/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Noto Sans"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        navy: {
          900: '#0f1723',
          800: '#1a2639',
          700: '#2f466a',
        },
        primary: {
          DEFAULT: '#0663f9',
          hover: '#0552d6',
        },
        'accent-gold': '#FFD700',
        'background-light': '#f5f7f8',
        'background-dark': '#0f1723',
        'card-dark': '#1a2639',
        'hover-dark': '#24344d',
        'surface-dark': '#1a2432',
        'surface-border': '#21314a',
        accent: {
          cyan: '#00f0ff',
          purple: '#bd00ff',
          green: '#0bda5e',
        },
        status: {
          critical: '#EF4444',
          info: '#3B82F6',
          online: '#10B981',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(189, 0, 255, 0.3)',
        'glow-blue': '0 0 20px rgba(6, 99, 249, 0.3)',
        'glow-green': '0 0 20px rgba(11, 218, 94, 0.3)',
        'glow-gold': '0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.2)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
