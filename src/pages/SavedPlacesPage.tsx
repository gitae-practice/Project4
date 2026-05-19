import { useState } from 'react'
import { MapPin, Trash2, Tag, Loader2, Pencil, Check, X } from 'lucide-react'
import { useSavedPlaces, useDeletePlace, useUpdatePlace } from '../hooks/useSavedPlaces'
import type { PlaceCategory, SavedPlace } from '../types'
import KakaoMap from '../components/KakaoMap'

const CATEGORY_COLOR: Record<PlaceCategory | '기타', string> = {
  음식점: 'bg-orange-100 text-orange-700',
  카페: 'bg-amber-100 text-amber-700',
  주점: 'bg-purple-100 text-purple-700',
  기타: 'bg-gray-100 text-gray-600',
}

export default function SavedPlacesPage() {
  const { data: places = [], isLoading } = useSavedPlaces()
  const deletePlace = useDeletePlace()
  const updatePlace = useUpdatePlace()
  const [selected, setSelected] = useState<SavedPlace | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMemo, setEditMemo] = useState('')

  function startEdit(place: SavedPlace, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(place.id)
    setEditMemo(place.memo || '')
  }

  function saveEdit(place: SavedPlace, e: React.MouseEvent) {
    e.stopPropagation()
    updatePlace.mutate({ id: place.id, memo: editMemo })
    setEditingId(null)
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(null)
  }

  const mapCenter = selected
    ? { lat: selected.lat, lng: selected.lng }
    : places.length > 0
    ? { lat: places[0].lat, lng: places[0].lng }
    : { lat: 37.5665, lng: 126.9780 }

  const markers = places.map((p) => ({ lat: p.lat, lng: p.lng, label: p.name }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-400" size={28} />
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
        <MapPin size={32} className="opacity-40" />
        <p className="text-sm">저장된 장소가 없습니다</p>
        <p className="text-xs">중간지점 탭에서 마음에 드는 곳을 저장해보세요</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-white">
        <div className="flex-1 overflow-y-auto p-4 pb-16 flex flex-col gap-2">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => setSelected(place.id === selected?.id ? null : place)}
              className={`bg-white rounded-lg border px-4 py-3 cursor-pointer transition-all shadow-sm ${
                selected?.id === place.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_COLOR[place.category] || CATEGORY_COLOR['기타']}`}>
                      {place.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</p>

                  {editingId === place.id ? (
                    <div className="mt-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="메모 입력..."
                        rows={2}
                        autoFocus
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
                      />
                      <div className="flex gap-1">
                        <button onClick={(e) => saveEdit(place, e)} className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600">
                          <Check size={11} /> 저장
                        </button>
                        <button onClick={cancelEdit} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200">
                          <X size={11} /> 취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 group/memo">
                      {place.memo
                        ? <p className="text-xs text-gray-600 flex-1">"{place.memo}"</p>
                        : <p className="text-xs text-gray-300 flex-1 italic">메모 없음</p>
                      }
                      <button
                        onClick={(e) => startEdit(place, e)}
                        className="opacity-0 group-hover/memo:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-all flex-shrink-0"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}

                  {place.companions.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Tag size={11} className="text-gray-400" />
                      {place.companions.map((c) => (
                        <span key={c} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePlace.mutate(place.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <KakaoMap
          center={mapCenter}
          markers={markers}
          zoom={selected ? 15 : 12}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
