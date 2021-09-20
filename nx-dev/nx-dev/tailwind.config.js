const path = require('path');
const { createGlobPatternsForDependencies } = require('@nrwl/next/tailwind');

module.exports = {
  mode: 'jit',
  purge: [
    path.join(__dirname, 'pages/**/*.{js,ts,jsx,tsx}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        black: 'hsla(0, 0%, 13%, 1)',
        blue: {
          'nx-dark': 'hsla(214, 61%, 11%, 1)',
          'nx-base': 'hsla(214, 62%, 21%, 1)',
        },
        green: {
          'nx-base': 'hsla(162, 47%, 50%, 1)',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '',
            },
            'code::after': {
              content: '',
            },
            'blockquote p:first-of-type::before': {
              content: '',
            },
            'blockquote p:last-of-type::after': {
              content: '',
            },
          },
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
