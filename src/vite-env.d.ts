/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/* Allow CSS custom properties (--var: value) in React inline style props */
import type {} from 'react'
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
