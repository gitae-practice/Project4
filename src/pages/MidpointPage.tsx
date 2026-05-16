import { useState, useMemo, useRef } from 'react'
import { Plus, X, Search, MapPin, Loader2, Bookmark, Check } from 'lucide-react'
import { geocode, calcMidpoint, searchByCategoryWithFallback, searchKeyword, CATEGORY } from '../lib/kakao'
import { useCreatePlace, useSavedPlaces } from '../hooks/useSavedPlaces'
import type { KakaoPlace, PlaceCategory } from '../types'
import KakaoMap from '../components/KakaoMap'

type Coord = { lat: number; lng: number; name: string }
type InputItem = { text: string; coord: Coord | null }

const TABS = [
  { label: '음식점', code: CATEGORY.RESTAURANT, category: '음식점' as PlaceCategory },
  { label: '카페', code: CATEGORY.CAFE, category: '카페' as PlaceCategory },
  { label: '주점', code: CATEGORY.BAR, category: '주점' as PlaceCategory },
]

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }

function formatRadius(m: number) {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`
}

export default function MidpointPage() {
  const [inputs, setInputs] = useState<InputItem[]>([{ text: '', coord: null }, { text: '', coord: null }])
  const [suggestions, setSuggestions] = useState<Record<number, KakaoPlace[]>>({})
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const [points, setPoints] = useState<Coord[]>([])
  const [midpoint, setMidpoint] = useState<{ lat: number; lng: number } | null>(null)
  const [places, setPlaces] = useState<KakaoPlace[]>([])
  const [searchRadius, setSearchRadius] = useState<number>(1500)
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const createPlace = useCreatePlace()
  const { data: savedPlaces = [] } = useSavedPlaces()
  const savedNames = useMemo(() => new Set(savedPlaces.map((p) => p.name)), [savedPlaces])

  function isSaved(place: KakaoPlace) { return savedNames.has(place.place_name) }

  function handleInputChange(i: number, val: string) {
    setInputs((prev) => prev.map((inp, idx) => idx === i ? { text: val, coord: null } : inp))
    clearTimeout(timers.current[i])
    if (!val.trim()) { setSuggestions((prev) => ({ ...prev, [i]: [] })); return }
    timers.current[i] = setTimeout(async () => {
      try {
        const results = await searchKeyword(val)
        setSuggestions((prev) => ({ ...prev, [i]: results.slice(0, 5) }))
      } catch { setSuggestions((prev) => ({ ...prev, [i]: [] })) }
    }, 300)
  }

  function selectSuggestion(i: number, place: KakaoPlace) {
    setInputs((prev) => prev.map((inp, idx) => idx === i
      ? { text: place.place_name, coord: { lat: Number(place.y), lng: Number(place.x), name: place.place_name } }
      : inp
    ))
    setSuggestions((prev) => ({ ...prev, [i]: [] }))
  }

  function addInput() { setInputs((prev) => [...prev, { text: '', coord: null }]) }
  function removeInput(i: number) {
    setInputs((prev) => prev.filter((_, idx) => idx !== i))
    setSuggestions((prev) => { const next = { ...prev }; delete next[i]; return next })
  }

  async function handleSearch() {
    const filled = inputs.filter((inp) => inp.text.trim())
    if (filled.length < 2) { setSearchError('출발지를 2개 이상 입력해주세요'); return }
    setLoading(true)
    setSearchError('')

    try {
      const resolved = await Promise.all(
        filled.map((inp) => inp.coord ? Promise.resolve(inp.coord) : geocode(inp.text))
      )
      const valid = resolved.filter(Boolean) as Coord[]
      if (valid.length < 2) { setSearchError('주소를 찾을 수 없는 항목이 있습니다'); return }

      const mid = calcMidpoint(valid)
      setPoints(valid)
      setMidpoint(mid)

      const { places: nearby, radius } = await searchByCategoryWithFallback(TABS[activeTab].code, mid.lat, mid.lng)
      setPlaces(nearby)
      setSearchRadius(radius)
    } catch (e) {
      setSearchError('검색 중 오류가 발생했습니다.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleTabChange(idx: number) {
    setActiveTab(idx)
    if (!midpoint) return
    setLoading(true)
    try {
      const { places: nearby, radius } = await searchByCategoryWithFallback(TABS[idx].code, midpoint.lat, midpoint.lng)
      setPlaces(nearby)
      setSearchRadius(radius)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleSave(place: KakaoPlace) {
    if (isSaved(place)) return
    createPlace.mutate({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat: Number(place.y),
      lng: Number(place.x),
      memo: '',
      companions: [],
      category: TABS[activeTab].category,
    })
  }

  const mapMarkers = [
    ...points.map((p) => ({ lat: p.lat, lng: p.lng, label: p.name })),
    ...(midpoint ? [{ lat: midpoint.lat, lng: midpoint.lng, label: '중간지점' }] : []),
    ...places.map((p) => ({ lat: Number(p.y), lng: Number(p.x) })),
  ]

  return (
    <div className="flex h-full">
      {/* 왼쪽 패널 */}
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-white">
        {/* 출발지 입력 */}
        <div className="p-4 flex flex-col gap-2 border-b border-gray-100 flex-shrink-0">
          {inputs.map((inp, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-colors">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={inp.text}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={i === 0 ? '내 출발지' : `상대방 출발지 ${i}`}
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {inp.coord && <Check size={13} className="text-green-500 flex-shrink-0" />}
                </div>
                {(suggestions[i] ?? []).length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {(suggestions[i] ?? []).map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => selectSuggestion(i, p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm text-gray-800">{p.place_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.road_address_name || p.address_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {inputs.length > 2 && (
                <button onClick={() => removeInput(i)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="flex gap-2 mt-1">
            <button onClick={addInput} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors px-2 py-1">
              <Plus size={13} /> 추가
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="ml-auto flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              중간지점 찾기
            </button>
          </div>
          {searchError && <p className="text-xs text-red-500">{searchError}</p>}
        </div>

        {/* 카테고리 탭 */}
        {midpoint && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {TABS.map((tab, i) => (
                <button
                  key={tab.code}
                  onClick={() => handleTabChange(i)}
                  className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                    activeTab === i ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 장소 목록 */}
        <div className="flex-1 overflow-y-auto p-4 pb-16 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-400" size={24} />
            </div>
          ) : midpoint && places.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-1 py-8 px-2">
              <p className="text-sm text-gray-400">반경 10km 이내에 장소가 없습니다</p>
              <p className="text-xs text-gray-300">두 출발지 거리가 너무 멀거나 중간지점이 바다 위일 수 있습니다</p>
            </div>
          ) : !midpoint ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
              <MapPin size={32} />
              <p className="text-sm">출발지를 입력하고 검색하세요</p>
            </div>
          ) : (
            <>
              {searchRadius > 1500 && (
                <p className="text-xs text-amber-500 px-1">
                  중간지점 근처에 결과가 없어 반경 {formatRadius(searchRadius)} 이내로 확장했습니다
                </p>
              )}
              {places.map((place) => {
                const saved = isSaved(place)
                return (
                  <div key={place.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{place.place_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{place.road_address_name || place.address_name}</p>
                      {place.phone && <p className="text-xs text-gray-400">{place.phone}</p>}
                    </div>
                    <button
                      onClick={() => handleSave(place)}
                      disabled={saved}
                      className={`p-2 rounded-md transition-colors flex-shrink-0 ${
                        saved ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* 오른쪽: 지도 */}
      <div className="flex-1 relative">
        <KakaoMap
          center={midpoint || DEFAULT_CENTER}
          markers={mapMarkers}
          zoom={midpoint ? 13 : 11}
          className="w-full h-full"
        />
        {!midpoint && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-100 pointer-events-none">
            <p className="text-xs text-gray-500 whitespace-nowrap">출발지를 입력하면 중간지점을 찾아드려요</p>
          </div>
        )}
      </div>
    </div>
  )
}
