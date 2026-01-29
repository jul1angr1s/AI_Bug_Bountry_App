/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0A0E1A',
          800: '#0F1421',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        status: {
          critical: '#EF4444',
          info: '#3B82F6',
          online: '#10B981',
        },
      },
    },
  },
  plugins: [],
}
