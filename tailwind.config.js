/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Corporate Primary Blues (extracted from SIGUEscola)
        'corp-blue': {
          50: '#e8f0fb',
          100: '#c5d5eb',
          200: '#9bb8d9',
          300: '#6e99c7',
          400: '#4a82b9',
          500: '#2563eb',
          600: '#1a4b8c',
          700: '#153d73',
          800: '#0f3060',
          900: '#0a1f3d',
        },
        // Accent Gold/Amber (SIGUEscola logo)
        'corp-gold': {
          50: '#fef8e7',
          100: '#fdefc2',
          200: '#fce09a',
          300: '#f5c84e',
          400: '#e8a317',
          500: '#d49212',
          600: '#b5790e',
          700: '#8f5e0a',
          800: '#6a4507',
          900: '#3d2704',
        },
        // Accent Teal (Module cards)
        'corp-teal': {
          50: '#e6faf7',
          100: '#b3f0e8',
          200: '#80e6d9',
          300: '#4ddccb',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0a7b72',
          800: '#065f56',
          900: '#04403a',
        },
        // Neutral palette
        'corp-neutral': {
          50: '#f0f4f8',
          100: '#e4eaf0',
          200: '#dce3ed',
          300: '#c5cdd8',
          400: '#8896a7',
          500: '#5a6a7e',
          600: '#3d4f63',
          700: '#2d3e50',
          800: '#1a2332',
          900: '#0d1117',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'corp-sm': '0.375rem',
        'corp': '0.5rem',
        'corp-md': '0.75rem',
        'corp-lg': '0.875rem',
        'corp-xl': '1rem',
        'corp-2xl': '1.25rem',
      },
      boxShadow: {
        'corp-sm': '0 1px 3px rgba(26, 75, 140, 0.06)',
        'corp': '0 4px 12px rgba(26, 75, 140, 0.08)',
        'corp-md': '0 6px 16px rgba(26, 75, 140, 0.1)',
        'corp-lg': '0 12px 32px rgba(26, 75, 140, 0.12)',
        'corp-modal': '0 25px 50px -12px rgba(26, 43, 60, 0.25)',
      },
    },
  },
  plugins: [],
}
