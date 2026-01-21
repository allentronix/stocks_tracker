/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Body text
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: 'normal' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: 'normal' }],   // 18px

        // Display text
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '700' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '800' }],   // 36px
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],           // 48px
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '900' }],        // 60px
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
    },
  },
  plugins: [],
}
