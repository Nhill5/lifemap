import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg:           'var(--bg)',
        'bg-elev':    'var(--bg-elev)',
        surface:      'var(--surface)',
        'surface-2':  'var(--surface-2)',
        'text-base':  'var(--text)',
        'text-dim':   'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
        school:       'var(--school)',
        work:         'var(--work)',
        fitness:      'var(--fitness)',
        looks:        'var(--looks)',
        hobby:        'var(--hobby)',
        warm:         'var(--warm)',
      },
      fontFamily: {
        voice: ['Fraunces', 'Georgia', 'serif'],
        ui:    ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
