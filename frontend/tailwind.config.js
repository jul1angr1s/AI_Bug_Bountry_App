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
      },
    },
  },
  plugins: [],
}
