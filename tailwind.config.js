/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Chifles brand colors
        chifle: {
          gold: '#F5A623',      // Warm yellow/gold (fried plantains)
          green: '#4A7C59',     // Plantain leaf green
          earth: '#8B7355',     // Piura desert earth
          cream: '#FFF8E7',     // Light cream background
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
