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
    // PKCE: the secure flow for a public SPA/PWA — auth code is exchanged
    // server-side, no access/refresh tokens in the URL fragment. Password
    // login (the primary in-PWA path) is unaffected by flowType. Magic-link /
    // reset links complete in-browser via the stored code_verifier, so they
    // work when the link is opened in the same browser the request came from.
    flowType: 'pkce',
  },
})
