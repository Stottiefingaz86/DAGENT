import type { Config } from 'tailwindcss'

/**
 * Lumen-only theme. Every colour maps to a CSS variable emitted by
 * `app/lumen.css` (generated from the Figma token exports). No raw hex here.
 */
const config: Config = {
  darkMode: ['class'],
  /* Touch devices: hover: / group-hover: only with real hover (no sticky tap-hover). */
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Lumen responsive breakpoints (tokens/figma/responsive.json)
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        link: 'var(--link)',
        header: {
          DEFAULT: 'var(--header-inverted)',
          foreground: 'var(--foreground-inverted)',
        },
        footer: {
          DEFAULT: 'var(--footer-inverted)',
          foreground: 'var(--foreground-inverted)',
        },
        'foreground-inverted': 'var(--foreground-inverted)',
        'border-inverted': 'var(--border-inverted)',
        'muted-foreground-inverted': 'var(--muted-foreground-inverted)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
          inverted: 'var(--secondary-inverted)',
          'foreground-inverted': 'var(--secondary-foreground-inverted)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
        },
        live: {
          DEFAULT: 'var(--live)',
          foreground: 'var(--live-foreground)',
        },
        featured: {
          DEFAULT: 'var(--featured)',
          foreground: 'var(--featured-foreground)',
        },
        'vip-rewards': {
          DEFAULT: 'var(--vip-rewards)',
          foreground: 'var(--vip-rewards-foreground)',
        },
        surface: {
          'muted-1': 'var(--surface-muted-1)',
          'muted-2': 'var(--surface-muted-2)',
          'muted-3': 'var(--surface-muted-3)',
          'muted-4': 'var(--surface-muted-4)',
          'muted-5': 'var(--surface-muted-5)',
          'muted-1-inverted': 'var(--surface-muted-1-inverted)',
          'muted-5-inverted': 'var(--surface-muted-5-inverted)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar-inverted, var(--sidebar))',
          foreground: 'var(--sidebar-foreground-inverted, var(--sidebar-foreground))',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
          'foreground-inverted': 'var(--sidebar-foreground-inverted)',
        },
      },
      /* Lumen type scale as size-only utilities (text-size-xs …): sets font-size from the token, leaves line-height alone. */
      fontSize: {
        'size-xxs': 'var(--typography-font-size-xxs)',
        'size-xs': 'var(--typography-font-size-xs)',
        'size-sm': 'var(--typography-font-size-sm)',
        'size-base': 'var(--typography-font-size-base)',
        'size-lg': 'var(--typography-font-size-lg)',
        'size-xl': 'var(--typography-font-size-xl)',
        'size-2xl': 'var(--typography-font-size-2xl)',
        'size-3xl': 'var(--typography-font-size-3xl)',
        'size-4xl': 'var(--typography-font-size-4xl)',
        'size-5xl': 'var(--typography-font-size-5xl)',
        'size-6xl': 'var(--typography-font-size-6xl)',
        'size-7xl': 'var(--typography-font-size-7xl)',
      },
      fontFamily: {
        sans: ['var(--font-figtree)', 'var(--font-family-font-sans)', 'sans-serif'],
        figtree: ['var(--font-figtree)', 'var(--font-family-font-sans)', 'sans-serif'],
        mono: ['var(--font-family-font-mono)', 'monospace'],
      },
      borderRadius: {
        none: 'var(--border-radius-none)',
        xs: 'var(--border-radius-xs)',
        sm: 'var(--border-radius-sm)',
        DEFAULT: 'var(--border-radius-md)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
        full: 'var(--border-radius-full)',
        small: 'var(--border-radius-sm)',
      },
      keyframes: {
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
