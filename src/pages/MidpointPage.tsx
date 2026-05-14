import { useState, useMemo } from 'react'
import { Plus, X, Search, MapPin, Loader2, Bookmark } from 'lucide-react'
import { geocode, calcMidpoint, searchByCategory, CATEGORY } from '../lib/kakao'
import { useCreatePlace, useSavedPlaces } from '../hooks/useSavedPlaces'
import type { KakaoPlace, PlaceCategory } from '../types'
import KakaoMap from '../components/KakaoMap'

type Point = { name: string; lat: number; lng: number }

const TABS = [
  { label: '음식점', code: CATEGORY.RESTAURANT, category: '음식점' as PlaceCategory },
  { label: '카페', code: CATEGORY.CAFE, category: '카페' as PlaceCategory },
  { label: '주점', code: CATEGORY.BAR, category: '주점' as PlaceCategory },
]

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }

export default function MidpointPage() {
  const [inputs, setInputs] = useState(['', ''])
  const [points, setPoints] = useState<Point[]>([])
  const [midpoint, setMidpoint] = useState<{ lat: number; lng: number } | null>(null)
  const [places, setPlaces] = useState<KakaoPlace[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const createPlace = useCreatePlace()
  const { data: savedPlaces = [] } = useSavedPlaces()

  const savedNames = useMemo(() => new Set(savedPlaces.map((p) => p.name)), [savedPlaces])

  function isSaved(place: KakaoPlace) {
    return savedNames.has(place.place_name)
  }

  function addInput() { setInputs((prev) => [...prev, '']) }
  function removeInput(i: number) { setInputs((prev) => prev.filter((_, idx) => idx !== i)) }
  function updateInput(i: number, val: string) {
    setInputs((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  }

  async function handleSearch() {
    const queries = inputs.map((v) => v.trim()).filter(Boolean)
    if (queries.length < 2) { setSearchError('출발지를 2개 이상 입력해주세요'); return }
    setLoading(true)
    setSearchError('')

    try {
      const results = await Promise.all(queries.map(geocode))
      const valid = results.filter(Boolean) as Point[]

      if (valid.length < 2) {
        setSearchError('주소를 찾을 수 없는 항목이 있습니다')
        return
      }

      const mid = calcMidpoint(valid)
      setPoints(valid)
      setMidpoint(mid)

      const nearby = await searchByCategory(TABS[activeTab].code, mid.lat, mid.lng)
      setPlaces(nearby)
    } catch (e) {
      setSearchError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
      const nearby = await searchByCategory(TABS[idx].code, midpoint.lat, midpoint.lng)
      setPlaces(nearby)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
      {/* 왼쪽 패널: 입력 + 결과 */}
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-white">
        {/* 출발지 입력 */}
        <div className="p-4 flex flex-col gap-2 border-b border-gray-100">
          {inputs.map((val, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-colors">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={val}
                  onChange={(e) => updateInput(i, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={i === 0 ? '내 출발지' : `상대방 출발지 ${i}`}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
              </div>
              {inputs.length > 2 && (
                <button onClick={() => removeInput(i)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="flex gap-2 mt-1">
            <button
              onClick={addInput}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors px-2 py-1"
            >
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
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-400" size={24} />
            </div>
          ) : midpoint && places.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">주변에 장소가 없습니다</p>
          ) : !midpoint ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
              <MapPin size={32} />
              <p className="text-sm">출발지를 입력하고 검색하세요</p>
            </div>
          ) : (
            places.map((place) => {
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
                    title={saved ? '이미 저장됨' : '저장'}
                  >
                    <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 오른쪽 패널: 지도 */}
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
