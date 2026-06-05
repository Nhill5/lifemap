/// <reference types="react" />
// TypeScript 5.6+ with moduleResolution:bundler no longer synthesizes named exports
// from @types/react's `export = React` CJS namespace. This shim re-declares the
// specific members our codebase imports so named destructuring continues to work.
// Using explicit signatures (not `typeof React.X`) to avoid circular reference issues.
declare module 'react' {
  // types (safe to re-export — no conflicts with the namespace's interface declarations)
  export type ReactNode = React.ReactNode
  export type CSSProperties = React.CSSProperties

  // hooks — explicit overloaded signatures matching @types/react
  export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>]
  export function useState<S = undefined>(): [S | undefined, React.Dispatch<React.SetStateAction<S | undefined>>]
  export function useEffect(effect: React.EffectCallback, deps?: React.DependencyList): void
  export function useRef<T>(initialValue: T): React.MutableRefObject<T>
  export function useRef<T>(initialValue: T | null): React.RefObject<T>
  export function useRef<T = undefined>(): React.MutableRefObject<T | undefined>
  export function useCallback<T extends React.AnyNativeEventHandler | ((...args: unknown[]) => unknown)>(callback: T, deps: React.DependencyList): T
  export function useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps: React.DependencyList): T
  export function useContext<T>(context: React.Context<T>): T
  export function createContext<T>(defaultValue: T): React.Context<T>
  export function createContext<T>(defaultValue: T | null): React.Context<T | null>

  // components
  export const StrictMode: React.ExoticComponent<{ children?: React.ReactNode }>
}
