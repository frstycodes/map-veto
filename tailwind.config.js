import defaultTheme from 'tailwindcss/defaultTheme'
import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        bg: 'var(--bg-image)'
      },
      fontFamily: {
        sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
        mono: ['Roboto Mono', ...defaultTheme.fontFamily.mono]
      },
      boxShadow: {
        glow: '0 0 10px 5px hsl(var(--background)/ 0.2)',
        'active-indicator': '0 0 2px var(--color-primary)',
        lift: '0 1px 2px hsl(var(--lift-shadow)), 0 12px 32px -12px hsl(var(--lift-shadow))',
        rim: 'inset 0 1px 0 #ffffff12, inset 0 -1px 0 #00000020, inset 0 0 0.5px 0.1px #ffffff12, inset 0 0 0.5px 0.4px #00000020'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        },
        'color-1': 'hsl(var(--color-1))',
        'color-2': 'hsl(var(--color-2))',
        'color-3': 'hsl(var(--color-3))',
        'color-4': 'hsl(var(--color-4))',
        'color-5': 'hsl(var(--color-5))'
      },
      animation: {
        ripple: 'ripple var(--duration,2s) ease calc(var(--i, 0)*.2s) infinite',
        shine: 'shine var(--duration) infinite linear',
        rainbow: 'rainbow var(--speed, 2s) infinite linear'
      },
      keyframes: {
        ripple: {
          '0%, 100%': {
            transform: 'translate(-50%, -50%) scale(1)'
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(0.9)'
          }
        },
        shine: {
          '0%': {
            'background-position': '0% 0%'
          },
          '50%': {
            'background-position': '100% 100%'
          },
          to: {
            'background-position': '0% 0%'
          }
        },
        rainbow: {
          '0%': {
            'background-position': '0%'
          },
          '100%': {
            'background-position': '200%'
          }
        }
      }
    }
  },
  plugins: [animate]
}
