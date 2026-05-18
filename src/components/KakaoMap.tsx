import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, LocateFixed, Loader2 } from 'lucide-react'

declare global {
  interface Window { kakao: any }
}

type Marker = { lat: number; lng: number; label?: string }
type Polyline = { path: { lat: number; lng: number }[]; color?: string; weight?: number; dashed?: boolean }

type Props = {
  center: { lat: number; lng: number }
  markers?: Marker[]
  polylines?: Polyline[]
  zoom?: number
  className?: string
}

export default function KakaoMap({ center, markers = [], polylines = [], zoom = 14, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRefs = useRef<any[]>([])
  const polylineRefs = useRef<any[]>([])
  const myLocationRef = useRef<any>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !window.kakao) return
    window.kakao.maps.load(() => {
      mapRef.current = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: zoom,
      })
    })
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
  }, [center.lat, center.lng])

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

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return
    polylineRefs.current.forEach((p) => p.setMap(null))
    polylineRefs.current = []

    polylines.forEach(({ path, color = '#3B82F6', weight = 5, dashed = false }) => {
      const linePath = path.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng))
      const polyline = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: weight,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeStyle: dashed ? 'dashed' : 'solid',
      })
      polyline.setMap(mapRef.current)
      polylineRefs.current.push(polyline)
    })
  }, [polylines])

  function zoomIn() {
    if (!mapRef.current) return
    mapRef.current.setLevel(mapRef.current.getLevel() - 1)
  }

  function zoomOut() {
    if (!mapRef.current) return
    mapRef.current.setLevel(mapRef.current.getLevel() + 1)
  }

  function goToMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (!mapRef.current || !window.kakao) { setLocating(false); return }
        const latlng = new window.kakao.maps.LatLng(lat, lng)
        mapRef.current.setCenter(latlng)
        mapRef.current.setLevel(3)

        if (myLocationRef.current) myLocationRef.current.setMap(null)
        myLocationRef.current = new window.kakao.maps.CustomOverlay({
          position: latlng,
          content: `<div style="width:14px;height:14px;background:#3B82F6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(59,130,246,0.4)"></div>`,
          yAnchor: 0.5,
          xAnchor: 0.5,
        })
        myLocationRef.current.setMap(mapRef.current)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute right-3 bottom-8 flex flex-col gap-1 z-10">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={goToMyLocation}
          disabled={locating}
          className="w-8 h-8 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors mt-1 disabled:opacity-50"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={14} />}
        </button>
      </div>
    </div>
  )
}
