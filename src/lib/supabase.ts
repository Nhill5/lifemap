import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env')
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    // Sign in once, stay signed in for weeks (§ auth/login fix). The installed
    // PWA keeps its session in its own localStorage; autoRefresh keeps the
    // access token fresh off the long-lived refresh token.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Keep the default implicit flow: a magic link tapped on iOS opens Safari
    // (a separate storage context from the standalone PWA), and implicit-flow
    // tokens ride in the URL with no PKCE verifier to lose. Password login is
    // the robust in-PWA path.
    flowType: 'implicit',
  },
})
