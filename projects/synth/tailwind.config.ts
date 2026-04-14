import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Berkeley Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        'primary-green': '#5AFD81',
        'primary-red': '#F8343D',
        'primary-yellow': '#E7F40F',
        'primary-cyan': '#00FFFF',
        'primary-magenta': '#FF00FF',
        'bg-main': '#000000',
        'bg-secondary': '#040D0A',
        'bg-other': '#060606',
        'table-item-bg': '#1F1F05',
        'table-item-fg': '#848D11',
        'table-title-alt': '#041A43',
        accent: '#BC8D25',
        'box-outline': '#1A1A1A',
        'box-bg': '#060606',
        'box-title-bg': '#CA8F31',
        'box-header-bg': '#130F04',
        'table-text': '#808080',
        'highlight-text': '#CA8F31',
        'highlight-bg': '#212107',
      },
    },
  },
  plugins: [],
}

export default config
