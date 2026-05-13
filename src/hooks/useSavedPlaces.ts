import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SavedPlace } from '../types'

export function useSavedPlaces() {
  return useQuery({
    queryKey: ['saved_places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SavedPlace[]
    },
  })
}

export function useCreatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (place: Omit<SavedPlace, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('saved_places').insert(place)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_places'] }),
  })
}

export function useDeletePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_places').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_places'] }),
  })
}
