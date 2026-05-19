import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SavedPlace, PlaceGroup } from '../types'

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
    onMutate: async (newPlace) => {
      await qc.cancelQueries({ queryKey: ['saved_places'] })
      const prev = qc.getQueryData<SavedPlace[]>(['saved_places']) ?? []
      const optimistic: SavedPlace = { ...newPlace, id: '__temp__', created_at: new Date().toISOString() }
      qc.setQueryData<SavedPlace[]>(['saved_places'], [optimistic, ...prev])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['saved_places'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['saved_places'] }),
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

export function useUpdatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, memo }: { id: string; memo: string }) => {
      const { error } = await supabase.from('saved_places').update({ memo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_places'] }),
  })
}

export function useUpdatePlaceGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string | null }) => {
      const { error } = await supabase.from('saved_places').update({ group_id: groupId }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_places'] }),
  })
}

export function usePlaceGroups() {
  return useQuery({
    queryKey: ['place_groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('place_groups')
        .select('*')
        .order('order_index', { ascending: true })
      if (error) throw error
      return data as PlaceGroup[]
    },
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('place_groups')
        .insert({ name, order_index: Date.now() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['place_groups'] }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('place_groups').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['place_groups'] })
      qc.invalidateQueries({ queryKey: ['saved_places'] })
    },
  })
}

export function useDeleteGroupWithPlaces() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: placesErr } = await supabase.from('saved_places').delete().eq('group_id', id)
      if (placesErr) throw placesErr
      const { error: groupErr } = await supabase.from('place_groups').delete().eq('id', id)
      if (groupErr) throw groupErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['place_groups'] })
      qc.invalidateQueries({ queryKey: ['saved_places'] })
    },
  })
}
