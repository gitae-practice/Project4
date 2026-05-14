import { useState, useRef } from 'react'
import { Plus, Trash2, MapPin, Cloud, Loader2, X, Check } from 'lucide-react'
import { useRoutes, useCreateRoute, useDeleteRoute } from '../hooks/useRoutes'
import { getWeather } from '../lib/weather'
import { searchKeyword } from '../lib/kakao'
import type { Route, WeatherData, KakaoPlace } from '../types'
import KakaoMap from '../components/KakaoMap'

type Coord = { name: string; lat: number; lng: number }

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }

export default function RoutesPage() {
  const { data: routes = [], isLoading } = useRoutes()
  const createRoute = useCreateRoute()
  const deleteRoute = useDeleteRoute()

  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [originInput, setOriginInput] = useState('')
  const [destInput, setDestInput] = useState('')
  const [originCoord, setOriginCoord] = useState<Coord | null>(null)
  const [destCoord, setDestCoord] = useState<Coord | null>(null)
  const [originSuggestions, setOriginSuggestions] = useState<KakaoPlace[]>([])
  const [destSuggestions, setDestSuggestions] = useState<KakaoPlace[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({})
  const [loadingWeather, setLoadingWeather] = useState<string | null>(null)

  const originTimer = useRef<ReturnType<typeof setTimeout>>()
  const destTimer = useRef<ReturnType<typeof setTimeout>>()

  function handleOriginChange(val: string) {
    setOriginInput(val)
    setOriginCoord(null)
    clearTimeout(originTimer.current)
    if (!val.trim()) { setOriginSuggestions([]); return }
    originTimer.current = setTimeout(async () => {
      try {
        const results = await searchKeyword(val)
        setOriginSuggestions(results.slice(0, 5))
      } catch { setOriginSuggestions([]) }
    }, 300)
  }

  function handleDestChange(val: string) {
    setDestInput(val)
    setDestCoord(null)
    clearTimeout(destTimer.current)
    if (!val.trim()) { setDestSuggestions([]); return }
    destTimer.current = setTimeout(async () => {
      try {
        const results = await searchKeyword(val)
        setDestSuggestions(results.slice(0, 5))
      } catch { setDestSuggestions([]) }
    }, 300)
  }

  function selectOrigin(place: KakaoPlace) {
    setOriginInput(place.place_name)
    setOriginCoord({ name: place.place_name, lat: Number(place.y), lng: Number(place.x) })
    setOriginSuggestions([])
  }

  function selectDest(place: KakaoPlace) {
    setDestInput(place.place_name)
    setDestCoord({ name: place.place_name, lat: Number(place.y), lng: Number(place.x) })
    setDestSuggestions([])
  }

  async function handleAdd() {
    if (!label || !originCoord || !destCoord) {
      setFormError(!label ? '경로 이름을 입력해주세요' : '목록에서 장소를 선택해주세요')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await createRoute.mutateAsync({
        label,
        origin_name: originCoord.name,
        origin_lat: originCoord.lat,
        origin_lng: originCoord.lng,
        dest_name: destCoord.name,
        dest_lat: destCoord.lat,
        dest_lng: destCoord.lng,
      })
      resetForm()
    } catch {
      setFormError('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setLabel('')
    setOriginInput('')
    setDestInput('')
    setOriginCoord(null)
    setDestCoord(null)
    setOriginSuggestions([])
    setDestSuggestions([])
    setFormError('')
    setAdding(false)
  }

  async function loadWeather(route: Route) {
    if (weatherMap[route.id]) return
    setLoadingWeather(route.id)
    try {
      const w = await getWeather(route.dest_lat, route.dest_lng)
      setWeatherMap((prev) => ({ ...prev, [route.id]: w }))
    } finally {
      setLoadingWeather(null)
    }
  }

  const mapMarkers = (() => {
    if (adding) {
      const m = []
      if (originCoord) m.push({ lat: originCoord.lat, lng: originCoord.lng, label: '출발' })
      if (destCoord) m.push({ lat: destCoord.lat, lng: destCoord.lng, label: '도착' })
      return m
    }
    if (selectedRoute) {
      return [
        { lat: selectedRoute.origin_lat, lng: selectedRoute.origin_lng, label: selectedRoute.origin_name },
        { lat: selectedRoute.dest_lat, lng: selectedRoute.dest_lng, label: selectedRoute.dest_name },
      ]
    }
    return []
  })()

  const mapCenter = (() => {
    if (adding && destCoord) return { lat: destCoord.lat, lng: destCoord.lng }
    if (adding && originCoord) return { lat: originCoord.lat, lng: originCoord.lng }
    if (selectedRoute) return { lat: selectedRoute.dest_lat, lng: selectedRoute.dest_lng }
    return DEFAULT_CENTER
  })()

  return (
    <div className="flex h-full">
      {/* 왼쪽: 폼 + 목록 */}
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors bg-white"
            >
              <Plus size={15} /> 경로 추가
            </button>
          )}

          {adding && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="경로 이름 (예: 집 → 회사)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors"
              />

              {/* 출발지 자동완성 */}
              <div className="relative">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-colors bg-white">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={originInput}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    placeholder="출발지 검색"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {originCoord && <Check size={13} className="text-green-500 flex-shrink-0" />}
                </div>
                {originSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {originSuggestions.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => selectOrigin(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm text-gray-800">{p.place_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.road_address_name || p.address_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 도착지 자동완성 */}
              <div className="relative">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-colors bg-white">
                  <MapPin size={13} className="text-blue-400 flex-shrink-0" />
                  <input
                    value={destInput}
                    onChange={(e) => handleDestChange(e.target.value)}
                    placeholder="도착지 검색"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {destCoord && <Check size={13} className="text-green-500 flex-shrink-0" />}
                </div>
                {destSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {destSuggestions.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => selectDest(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm text-gray-800">{p.place_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.road_address_name || p.address_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  저장
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-lg transition-colors"
                >
                  <X size={13} /> 취소
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-400" size={24} />
            </div>
          ) : routes.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">저장된 경로가 없습니다</p>
          ) : (
            routes.map((route) => {
              const weather = weatherMap[route.id]
              const isSelected = selectedRoute?.id === route.id
              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRoute(isSelected ? null : route)}
                  className={`bg-white rounded-lg border px-4 py-3 shadow-sm cursor-pointer transition-all ${
                    isSelected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{route.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {route.origin_name} → {route.dest_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); loadWeather(route) }}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors"
                      >
                        {loadingWeather === route.id ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
                        날씨
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRoute.mutate(route.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {weather && (
                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-3">
                      <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt={weather.description} className="w-8 h-8" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{weather.temp}°C</p>
                        <p className="text-xs text-gray-400">{weather.description} · 습도 {weather.humidity}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 오른쪽: 지도 */}
      <div className="flex-1 relative">
        <KakaoMap
          center={mapCenter}
          markers={mapMarkers}
          zoom={13}
          className="w-full h-full"
        />
        {!adding && !selectedRoute && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-100 pointer-events-none">
            <p className="text-xs text-gray-500 whitespace-nowrap">경로를 선택하면 지도에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
