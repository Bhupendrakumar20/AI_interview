import tailwindcssAnimate from 'tailwindcss-animate'

const config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './lib/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          100: '#dddfff',
          200: '#cac5fe',
          300: '#a9a2fe',
          400: '#8b7ffe',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          100: '#f75353',
          200: '#c44141',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        light: {
          100: '#d6e0ff',
          200: '#b8c4ff',
          400: '#6870a6',
          600: '#4f557d',
          800: '#24273a',
        },
        dark: {
          100: '#020408',
          150: '#0a0e1a',
          200: '#27282f',
          250: '#1e1f26',
          300: '#242633',
        },
        success: {
          100: '#49de50',
          200: '#42c748',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        fadeInUp: 'fadeInUp 0.6s ease-out',
        fadeInScale: 'fadeInScale 0.4s ease-out',
        slideInLeft: 'slideInLeft 0.5s ease-out',
        slideInRight: 'slideInRight 0.5s ease-out',
        float: 'float 3s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-out infinite',
        ripple: 'ripple 1.5s ease-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        spinSlow: 'spinSlow 8s linear infinite',
        bounceSubtle: 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInScale: {
          from: {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          to: {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        slideInLeft: {
          from: {
            opacity: '0',
            transform: 'translateX(-30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideInRight: {
          from: {
            opacity: '0',
            transform: 'translateX(30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        pulseGlow: {
          '0%, 100%': {
            opacity: '0.5',
            boxShadow: '0 0 0 0 rgba(202, 197, 254, 0.4)',
          },
          '50%': {
            opacity: '1',
            boxShadow: '0 0 0 20px rgba(202, 197, 254, 0)',
          },
        },
        ripple: {
          '0%': {
            boxShadow: '0 0 0 0 rgba(202, 197, 254, 0.7)',
            opacity: '0.5',
          },
          '100%': {
            boxShadow: '0 0 0 30px rgba(202, 197, 254, 0)',
            opacity: '0',
          },
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        spinSlow: {
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          },
        },
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(202, 197, 254, 0.3)',
        'glow-lg': '0 0 30px rgba(202, 197, 254, 0.5)',
        'inner-glow': 'inset 0 0 10px rgba(202, 197, 254, 0.2)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
