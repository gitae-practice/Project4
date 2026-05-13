import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { LocationShare } from '../types'

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function useShareLocation() {
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const codeRef = useRef<string | null>(null)

  function clearWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  async function start(label: string) {
    clearWatch() // 이전 감시 세션 정리

    let pos: GeolocationPosition
    try {
      pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      )
    } catch {
      setError('위치 권한이 필요합니다')
      return
    }

    const code = genCode()
    const { error: dbError } = await supabase.from('location_shares').insert({
      share_code: code,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      label,
    })
    if (dbError) { setError('공유 시작 실패'); return }

    codeRef.current = code
    setShareCode(code)
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (p) => {
        await supabase.from('location_shares').update({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          updated_at: new Date().toISOString(),
        }).eq('share_code', code)
      },
      () => setError('위치 추적 중 오류 발생'),
      { enableHighAccuracy: true }
    )
  }

  async function stop() {
    clearWatch()
    if (codeRef.current) {
      await supabase.from('location_shares').delete().eq('share_code', codeRef.current)
      codeRef.current = null
    }
    setShareCode(null)
  }

  useEffect(() => () => { clearWatch() }, [])

  return { shareCode, error, start, stop }
}

export function useWatchLocation(shareCode: string) {
  const [location, setLocation] = useState<LocationShare | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!shareCode) return

    supabase
      .from('location_shares')
      .select('*')
      .eq('share_code', shareCode)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setLocation(data as LocationShare)
      })

    const channel = supabase
      .channel(`share-${shareCode}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'location_shares', filter: `share_code=eq.${shareCode}` },
        (payload) => setLocation(payload.new as LocationShare)
      )
      .subscribe()

    return () => { channel.unsubscribe(); supabase.removeChannel(channel) }
  }, [shareCode])

  return { location, notFound }
}
