import { useState, useRef } from 'react'
import { MapPin, Trash2, Tag, Loader2, Pencil, Check, X, Plus } from 'lucide-react'
import {
  useSavedPlaces, useDeletePlace, useUpdatePlace, useUpdatePlaceGroup,
  usePlaceGroups, useCreateGroup, useDeleteGroup,
} from '../hooks/useSavedPlaces'
import type { SavedPlace } from '../types'
import KakaoMap from '../components/KakaoMap'

const CATEGORY_COLOR: Record<string, string> = {
  음식점: 'bg-orange-100 text-orange-700',
  카페: 'bg-amber-100 text-amber-700',
  주점: 'bg-purple-100 text-purple-700',
  편의점: 'bg-green-100 text-green-700',
  관광명소: 'bg-teal-100 text-teal-700',
  문화시설: 'bg-indigo-100 text-indigo-700',
  지하철역: 'bg-blue-100 text-blue-700',
  기타: 'bg-gray-100 text-gray-600',
}

export default function SavedPlacesPage() {
  const { data: places = [], isLoading } = useSavedPlaces()
  const { data: groups = [] } = usePlaceGroups()
  const deletePlace = useDeletePlace()
  const updatePlace = useUpdatePlace()
  const updatePlaceGroup = useUpdatePlaceGroup()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()

  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [selected, setSelected] = useState<SavedPlace | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMemo, setEditMemo] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [dragOverTab, setDragOverTab] = useState<string | 'all' | null>(null)
  const draggingId = useRef<string | null>(null)

  const displayedPlaces = activeTab === null
    ? places
    : places.filter(p => p.group_id === activeTab)

  const mapCenter = selected
    ? { lat: selected.lat, lng: selected.lng }
    : places.length > 0 ? { lat: places[0].lat, lng: places[0].lng }
    : { lat: 37.5665, lng: 126.9780 }
  const markers = places.map(p => ({ lat: p.lat, lng: p.lng, label: p.name }))

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

  function handleCreateGroup() {
    if (!newGroupName.trim()) return
    createGroup.mutate(newGroupName.trim(), {
      onSuccess: () => {
        setNewGroupName('')
        setCreatingGroup(false)
      }
    })
  }

  function handleDropOnTab(groupId: string | null) {
    if (!draggingId.current) return
    updatePlaceGroup.mutate({ id: draggingId.current, groupId })
    draggingId.current = null
    setDragOverTab(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-400" size={28} />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-white">

        {/* 탭 바 */}
        <div className="flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto">
            {/* 전체 탭 */}
            <button
              onClick={() => setActiveTab(null)}
              onDragOver={(e) => { e.preventDefault(); setDragOverTab('all') }}
              onDragLeave={() => setDragOverTab(null)}
              onDrop={() => handleDropOnTab(null)}
              className={`px-3 py-1.5 text-xs rounded-t-lg whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === null
                  ? 'bg-white border border-b-white border-gray-200 text-gray-900 font-medium -mb-px z-10 relative'
                  : 'text-gray-400 hover:text-gray-600'
              } ${dragOverTab === 'all' ? 'ring-2 ring-blue-300' : ''}`}
            >
              전체 ({places.length})
            </button>

            {/* 분류 탭들 */}
            {groups.map(g => (
              <div key={g.id} className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveTab(g.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverTab(g.id) }}
                  onDragLeave={() => setDragOverTab(null)}
                  onDrop={() => handleDropOnTab(g.id)}
                  className={`pl-3 pr-7 py-1.5 text-xs rounded-t-lg whitespace-nowrap transition-colors ${
                    activeTab === g.id
                      ? 'bg-white border border-b-white border-gray-200 text-gray-900 font-medium -mb-px z-10 relative'
                      : 'text-gray-400 hover:text-gray-600'
                  } ${dragOverTab === g.id ? 'ring-2 ring-blue-300' : ''}`}
                >
                  {g.name} ({places.filter(p => p.group_id === g.id).length})
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(g.id) }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors"
                  title="분류 삭제"
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* 새 분류 버튼 */}
            <button
              onClick={() => setCreatingGroup(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              <Plus size={11} /> 새 분류
            </button>
          </div>

          {/* 새 분류 입력 */}
          {creatingGroup && (
            <div className="px-3 pb-2 pt-1 flex gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                placeholder="분류 이름 입력"
                autoFocus
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
              />
              <button onClick={handleCreateGroup} className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">만들기</button>
              <button onClick={() => { setCreatingGroup(false); setNewGroupName('') }} className="px-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          )}
        </div>

        {/* 장소 목록 */}
        <div className="flex-1 overflow-y-auto p-3 pb-16 flex flex-col gap-2">
          {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <MapPin size={32} className="opacity-40" />
              <p className="text-sm">저장된 장소가 없습니다</p>
              <p className="text-xs">중간지점 탭에서 마음에 드는 곳을 저장해보세요</p>
            </div>
          ) : displayedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
              <MapPin size={28} />
              <p className="text-sm">이 분류에 장소가 없습니다</p>
              <p className="text-xs">장소 카드를 이 탭으로 드래그하세요</p>
            </div>
          ) : (
            displayedPlaces.map(place => {
              const groupName = place.group_id ? groups.find(g => g.id === place.group_id)?.name : null
              return (
                <div
                  key={place.id}
                  draggable
                  onDragStart={() => { draggingId.current = place.id }}
                  onDragEnd={() => { draggingId.current = null; setDragOverTab(null) }}
                  onClick={() => setSelected(place.id === selected?.id ? null : place)}
                  className={`bg-white rounded-lg border px-3 py-2.5 cursor-pointer transition-all shadow-sm ${
                    selected?.id === place.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_COLOR[place.category] ?? CATEGORY_COLOR['기타']}`}>
                          {place.category}
                        </span>
                        {activeTab === null && groupName && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 flex-shrink-0">
                            {groupName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</p>

                      {editingId === place.id ? (
                        <div className="mt-2 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                          <textarea
                            value={editMemo}
                            onChange={e => setEditMemo(e.target.value)}
                            placeholder="메모 입력..."
                            rows={2}
                            autoFocus
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
                          />
                          <div className="flex gap-1">
                            <button onClick={e => saveEdit(place, e)} className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600">
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
                            onClick={e => startEdit(place, e)}
                            className="opacity-0 group-hover/memo:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-all flex-shrink-0"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}

                      {place.companions.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Tag size={11} className="text-gray-400" />
                          {place.companions.map(c => (
                            <span key={c} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deletePlace.mutate(place.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
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
