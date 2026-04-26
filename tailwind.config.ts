import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        zbt: {
          navy:          '#002F6C',
          'navy-dark':   '#001F4A',
          'navy-light':  '#0044A0',
          gold:          '#C4A44A',
          'gold-bright': '#FFB81C',
          white:         '#FFFFFF',
          'navy-50':     '#EEF2F9',
          'navy-100':    '#D6E0F0',
          'navy-200':    '#ADBFDE',
          'gold-50':     '#FDF8EC',
          'gold-100':    '#F9EDCA',
        },
      },
      boxShadow: {
        card:      '0 1px 3px 0 rgba(0,47,108,0.08), 0 1px 2px -1px rgba(0,47,108,0.06)',
        'card-md': '0 4px 6px -1px rgba(0,47,108,0.10), 0 2px 4px -2px rgba(0,47,108,0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
