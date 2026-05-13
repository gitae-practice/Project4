import { useEffect, useRef } from 'react'

declare global {
  interface Window { kakao: any }
}

type Marker = {
  lat: number
  lng: number
  label?: string
}

type Props = {
  center: { lat: number; lng: number }
  markers?: Marker[]
  zoom?: number
  className?: string
}

export default function KakaoMap({ center, markers = [], zoom = 14, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRefs = useRef<any[]>([])

  useEffect(() => {
    if (!containerRef.current || !window.kakao) return
    window.kakao.maps.load(() => {
      mapRef.current = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: zoom,
      })
    })
  }, [])

  // 중심 좌표 변경 시 지도 이동
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
  }, [center.lat, center.lng])

  // 마커 목록 변경 시 기존 마커 제거 후 재렌더링
  useEffect(() => {
    if (!mapRef.current || !window.kakao) return

    markerRefs.current.forEach((m) => m.setMap(null))
    markerRefs.current = []

    markers.forEach(({ lat, lng, label }) => {
      const pos = new window.kakao.maps.LatLng(lat, lng)
      const marker = new window.kakao.maps.Marker({ position: pos, map: mapRef.current })
      markerRefs.current.push(marker)

      if (label) {
        const overlay = new window.kakao.maps.CustomOverlay({
          position: pos,
          content: `<div style="background:#1e293b;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;white-space:nowrap;transform:translateY(-40px)">${label}</div>`,
          yAnchor: 1,
        })
        overlay.setMap(mapRef.current)
        markerRefs.current.push(overlay)
      }
    })
  }, [markers])

  return <div ref={containerRef} className={className} />
}
