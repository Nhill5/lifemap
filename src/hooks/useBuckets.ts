import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Bucket } from '@/types'

export function useBuckets(): Bucket[] {
  const { user } = useAuth()
  const [buckets, setBuckets] = useState<Bucket[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('buckets')
      .select('*')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('sort_order')
      .then(({ data }) => setBuckets((data as Bucket[]) ?? []))
  }, [user])

  return buckets
}
