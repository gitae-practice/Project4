import { useState } from 'react'
import { Plus, Trash2, MapPin, Cloud, Loader2, X, Check } from 'lucide-react'
import { useRoutes, useCreateRoute, useDeleteRoute } from '../hooks/useRoutes'
import { getWeather } from '../lib/weather'
import { geocode } from '../lib/kakao'
import type { Route, WeatherData } from '../types'

export default function RoutesPage() {
  const { data: routes = [], isLoading } = useRoutes()
  const createRoute = useCreateRoute()
  const deleteRoute = useDeleteRoute()

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', origin: '', dest: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // 라우트별 날씨 캐시
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({})
  const [loadingWeather, setLoadingWeather] = useState<string | null>(null)

  async function handleAdd() {
    if (!form.label || !form.origin || !form.dest) { setFormError('모두 입력해주세요'); return }
    setSaving(true)
    setFormError('')

    const [origin, dest] = await Promise.all([geocode(form.origin), geocode(form.dest)])
    if (!origin || !dest) { setFormError('주소를 찾을 수 없습니다'); setSaving(false); return }

    await createRoute.mutateAsync({
      label: form.label,
      origin_name: origin.name,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_name: dest.name,
      dest_lat: dest.lat,
      dest_lng: dest.lng,
    })
    setForm({ label: '', origin: '', dest: '' })
    setAdding(false)
    setSaving(false)
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

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* 경로 추가 버튼 */}
      <button
        onClick={() => setAdding(true)}
        className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
      >
        <Plus size={15} /> 경로 추가
      </button>

      {/* 경로 추가 폼 */}
      {adding && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="경로 이름 (예: 집 → 회사)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors"
          />
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="출발지"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-blue-400 flex-shrink-0" />
            <input
              value={form.dest}
              onChange={(e) => setForm({ ...form, dest: e.target.value })}
              placeholder="도착지"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors"
            />
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
              onClick={() => { setAdding(false); setForm({ label: '', origin: '', dest: '' }); setFormError('') }}
              className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-lg transition-colors"
            >
              <X size={13} /> 취소
            </button>
          </div>
        </div>
      )}

      {/* 경로 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-400" size={24} />
        </div>
      ) : routes.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">저장된 경로가 없습니다</p>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {routes.map((route) => {
            const weather = weatherMap[route.id]
            return (
              <div key={route.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{route.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {route.origin_name} → {route.dest_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => loadWeather(route)}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors"
                    >
                      {loadingWeather === route.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Cloud size={12} />}
                      날씨
                    </button>
                    <button
                      onClick={() => deleteRoute.mutate(route.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {weather && (
                  <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-3">
                    <img
                      src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                      alt={weather.description}
                      className="w-8 h-8"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{weather.temp}°C</p>
                      <p className="text-xs text-gray-400">{weather.description} · 습도 {weather.humidity}%</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
