import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Route } from '../types'

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Route[]
    },
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (route: Omit<Route, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('routes').insert(route)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })
}
