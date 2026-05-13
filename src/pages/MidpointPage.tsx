import { useState } from 'react'
import { Plus, X, Search, MapPin, Loader2, Bookmark } from 'lucide-react'
import { geocode, calcMidpoint, searchByCategory, CATEGORY } from '../lib/kakao'
import { useCreatePlace } from '../hooks/useSavedPlaces'
import type { KakaoPlace, PlaceCategory } from '../types'
import KakaoMap from '../components/KakaoMap'

type Point = { name: string; lat: number; lng: number }

const TABS = [
  { label: '음식점', code: CATEGORY.RESTAURANT, category: '음식점' as PlaceCategory },
  { label: '카페', code: CATEGORY.CAFE, category: '카페' as PlaceCategory },
  { label: '주점', code: CATEGORY.BAR, category: '주점' as PlaceCategory },
]

export default function MidpointPage() {
  const [inputs, setInputs] = useState(['', ''])
  const [points, setPoints] = useState<Point[]>([])
  const [midpoint, setMidpoint] = useState<{ lat: number; lng: number } | null>(null)
  const [places, setPlaces] = useState<KakaoPlace[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const createPlace = useCreatePlace()

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

    const results = await Promise.all(queries.map(geocode))
    const valid = results.filter(Boolean) as Point[]

    if (valid.length < 2) {
      setSearchError('주소를 찾을 수 없는 항목이 있습니다')
      setLoading(false)
      return
    }

    const mid = calcMidpoint(valid)
    setPoints(valid)
    setMidpoint(mid)

    const nearby = await searchByCategory(TABS[activeTab].code, mid.lat, mid.lng)
    setPlaces(nearby)
    setLoading(false)
  }

  async function handleTabChange(idx: number) {
    setActiveTab(idx)
    if (!midpoint) return
    setLoading(true)
    const nearby = await searchByCategory(TABS[idx].code, midpoint.lat, midpoint.lng)
    setPlaces(nearby)
    setLoading(false)
  }

  function handleSave(place: KakaoPlace) {
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
    <div className="flex flex-col h-full gap-4 p-4">
      {/* 출발지 입력 */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col gap-2">
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
        </div>

        <div className="flex gap-2 mt-3">
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
        {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
      </div>

      {midpoint && (
        <>
          {/* 지도 */}
          <KakaoMap
            center={midpoint}
            markers={mapMarkers}
            zoom={13}
            className="w-full h-64 rounded-lg overflow-hidden border border-gray-100"
          />

          {/* 카테고리 탭 */}
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

          {/* 장소 목록 */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-blue-400" size={24} />
              </div>
            ) : places.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">주변에 장소가 없습니다</p>
            ) : (
              places.map((place) => (
                <div key={place.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{place.place_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{place.road_address_name || place.address_name}</p>
                    {place.phone && <p className="text-xs text-gray-400">{place.phone}</p>}
                  </div>
                  <button
                    onClick={() => handleSave(place)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
                    title="저장"
                  >
                    <Bookmark size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
