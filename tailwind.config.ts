import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Berkeley Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
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
        'accent': '#BC8D25',
        'box-outline': '#1A1A1A',
        'box-bg': '#060606',
        'box-title-bg': '#CA8F31',
        'box-header-bg': '#130F04',
        'table-text': '#808080',
        'highlight-text': '#CA8F31',
        'highlight-bg': '#212107',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'terminal-scan': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
      },
      animation: {
        'blink': 'blink 1s infinite',
        'scan': 'scan 2s linear infinite',
        'digit-pulse': 'digit-pulse 0.8s ease-in-out infinite alternate',
        'digit-red-pulse': 'digit-red-pulse 0.8s ease-in-out infinite alternate',
        'button-flash-red': 'button-flash-red 1s ease-in-out infinite',
        'speed-grid-flash': 'speed-grid-flash 0.5s ease-in-out infinite alternate',
        'equalizer-pulse': 'equalizer-pulse 0.8s ease-in-out infinite alternate',
        'equalizer-red-pulse': 'equalizer-red-pulse 0.8s ease-in-out infinite alternate',
        'equalizer-flash': 'equalizer-flash 0.5s ease-in-out infinite alternate',
        'globe-rotate': 'globe-rotate 28s linear infinite',
        'globe-wobble': 'globe-wobble 12s ease-in-out infinite',
        'globe-rotate-x': 'globe-rotate-x 28s linear infinite',
        'globe-rotate-z': 'globe-rotate-z 28s linear infinite',
        'globe-red-pulse': 'globe-red-pulse 0.6s ease-in-out infinite alternate',
        'point-pulse': 'point-pulse 3s ease-in-out infinite',
        'scan-sweep': 'scan-sweep 6s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'digit-pulse': {
          '0%': {
            'text-shadow': '0 0 6px rgba(90,253,129,0.8), 0 0 10px rgba(90,253,129,0.5), 0 0 12px rgba(90,253,129,0.3)',
          },
          '100%': {
            'text-shadow': '0 0 8px rgba(90,253,129,1), 0 0 12px rgba(90,253,129,0.7), 0 0 16px rgba(90,253,129,0.5)',
          },
        },
        'digit-red-pulse': {
          '0%': {
            'text-shadow': '0 0 6px rgba(255,68,68,0.8), 0 0 10px rgba(255,68,68,0.5), 0 0 12px rgba(255,68,68,0.3)',
          },
          '100%': {
            'text-shadow': '0 0 8px rgba(255,68,68,1), 0 0 12px rgba(255,68,68,0.7), 0 0 16px rgba(255,68,68,0.5)',
          },
        },
        'button-flash-red': {
          '0%, 100%': {
            'background-color': '#FF4444',
            'border-color': '#FF4444',
          },
        },
        'speed-grid-flash': {
          '0%': {
            'background-color': '#CF202B',
            'border-color': '#CF202B',
          },
          '100%': {
            'background-color': '#FF4444',
            'border-color': '#FF4444',
          },
        },
        'equalizer-pulse': {
          '0%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 8px rgba(90,253,129,0.6), 0 0 12px rgba(90,253,129,0.3)',
          },
          '100%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.4), 0 0 12px rgba(90,253,129,0.8), 0 0 16px rgba(90,253,129,0.5)',
          },
        },
        'equalizer-red-pulse': {
          '0%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 8px rgba(255,68,68,0.6), 0 0 12px rgba(255,68,68,0.3)',
          },
          '100%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.4), 0 0 12px rgba(255,68,68,0.8), 0 0 16px rgba(255,68,68,0.5)',
          },
        },
        'equalizer-flash': {
          '0%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px rgba(207,32,43,0.6)',
          },
          '100%': {
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px rgba(255,68,68,0.8)',
          },
        },
        'globe-rotate': {
          'from': { 
            'transform': 'rotateY(0deg) rotateX(15deg)',
          },
          'to': { 
            'transform': 'rotateY(360deg) rotateX(15deg)',
          },
        },
        'globe-wobble': {
          '0%': { 
            'transform': 'rotateX(0deg) rotateZ(0deg)',
          },
          '25%': { 
            'transform': 'rotateX(4deg) rotateZ(2deg)',
          },
          '50%': { 
            'transform': 'rotateX(0deg) rotateZ(0deg)',
          },
          '75%': { 
            'transform': 'rotateX(-4deg) rotateZ(-2deg)',
          },
          '100%': { 
            'transform': 'rotateX(0deg) rotateZ(0deg)',
          },
        },
        'globe-rotate-x': {
          'from': { 
            'transform': 'rotateX(0deg)',
          },
          'to': { 
            'transform': 'rotateX(360deg)',
          },
        },
        'globe-rotate-z': {
          'from': { 
            'transform': 'rotateZ(0deg)',
          },
          'to': { 
            'transform': 'rotateZ(360deg)',
          },
        },
        'globe-red-pulse': {
          '0%': {
            'border-color': '#FF4444',
            'box-shadow': '0 0 8px rgba(255,68,68,0.6), 0 0 12px rgba(255,68,68,0.3)',
          },
          '100%': {
            'border-color': '#FF6666',
            'box-shadow': '0 0 16px rgba(255,102,102,0.9), 0 0 20px rgba(255,102,102,0.6)',
          },
        },
        'point-pulse': {
          '0%, 100%': { 
            'opacity': 'inherit',
            'transform': 'translate(-50%, -50%) scale(1)',
          },
          '50%': { 
            'opacity': '1',
            'transform': 'translate(-50%, -50%) scale(1.3)',
          },
        },
        'scan-sweep': {
          '0%': { 
            'transform': 'translateY(-60px) scaleX(0.6)',
            'opacity': '0',
          },
          '20%': { 
            'opacity': '0.8',
            'transform': 'translateY(-20px) scaleX(0.9)',
          },
          '50%': { 
            'opacity': '1',
            'transform': 'translateY(0px) scaleX(1)',
          },
          '80%': { 
            'opacity': '0.8',
            'transform': 'translateY(20px) scaleX(0.9)',
          },
          '100%': { 
            'transform': 'translateY(60px) scaleX(0.6)',
            'opacity': '0',
          },
        },
      }
    },
  },
  plugins: [],
}
export default config
