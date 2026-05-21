import { useState, useRef, useMemo } from 'react'
import { MapPin, Trash2, Tag, Loader2, Pencil, Check, X, ChevronDown, ChevronRight, FolderPlus, GripVertical, Users, Search } from 'lucide-react'
import {
  useSavedPlaces, useDeletePlace, useUpdatePlace, useUpdatePlaceGroup,
  usePlaceGroups, useCreateGroup, useDeleteGroup, useDeleteGroupWithPlaces,
} from '../hooks/useSavedPlaces'
import type { SavedPlace, PlaceGroup } from '../types'
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

function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export default function SavedPlacesPage() {
  const { data: places = [], isLoading } = useSavedPlaces()
  const { data: groups = [] } = usePlaceGroups()
  const deletePlace = useDeletePlace()
  const updatePlace = useUpdatePlace()
  const updatePlaceGroup = useUpdatePlaceGroup()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const deleteGroupWithPlaces = useDeleteGroupWithPlaces()
  const [deleteTarget, setDeleteTarget] = useState<PlaceGroup | null>(null)

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<SavedPlace | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMemo, setEditMemo] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [filterCompanion, setFilterCompanion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 폴더 순서
  const [groupOrder, setGroupOrder] = useState<string[]>(() => loadLS('saved_group_order', []))
  const dragGroupItem = useRef<string | null>(null)
  const dragGroupOver = useRef<string | null>(null)

  // 아이템 순서 (폴더별)
  const [placeOrders, setPlaceOrders] = useState<Record<string, string[]>>(() => loadLS('saved_place_orders', {}))
  const dragPlaceItem = useRef<string | null>(null)
  const dragPlaceOver = useRef<string | null>(null)
  const dragPlaceGroupKey = useRef<string | null>(null)

  // 드래그 타입 구분 (group vs place)
  const dragType = useRef<'group' | 'place' | null>(null)
  const [dropTargetGroup, setDropTargetGroup] = useState<string | null>(null)

  const sortedGroups = useMemo(() => {
    if (!groupOrder.length) return groups
    const map = new Map(groupOrder.map((id, i) => [id, i]))
    return [...groups].sort((a, b) => (map.get(a.id) ?? Infinity) - (map.get(b.id) ?? Infinity))
  }, [groups, groupOrder])

  const allCompanions = useMemo(() => {
    const set = new Set<string>()
    places.forEach(p => p.companions.forEach(c => set.add(c)))
    return [...set].sort()
  }, [places])

  const visiblePlaces = useMemo(() => {
    let result = places
    if (filterCompanion) result = result.filter(p => p.companions.includes(filterCompanion))
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
    }
    return result
  }, [places, filterCompanion, searchQuery])

  function getSortedPlaces(key: string, list: SavedPlace[]) {
    const order: string[] = placeOrders[key] ?? []
    if (!order.length) return list
    const map = new Map(order.map((id, i) => [id, i]))
    return [...list].sort((a, b) => (map.get(a.id) ?? Infinity) - (map.get(b.id) ?? Infinity))
  }

  const ungrouped = getSortedPlaces('ungrouped', visiblePlaces.filter(p => !p.group_id))

  function isGroupOpen(id: string) {
    if (searchQuery.trim()) return true
    return openGroups.has(id)
  }

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // 폴더 드래그 정렬
  function handleGroupDragStart(id: string) {
    dragType.current = 'group'
    dragGroupItem.current = id
  }
  function handleGroupDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (dragType.current !== 'group') return
    dragGroupOver.current = id
  }
  function handleGroupDrop() {
    if (dragType.current !== 'group' || !dragGroupItem.current || !dragGroupOver.current || dragGroupItem.current === dragGroupOver.current) return
    const order = sortedGroups.map(g => g.id)
    const from = order.indexOf(dragGroupItem.current)
    const to = order.indexOf(dragGroupOver.current)
    order.splice(from, 1); order.splice(to, 0, dragGroupItem.current)
    setGroupOrder(order)
    localStorage.setItem('saved_group_order', JSON.stringify(order))
    dragGroupItem.current = null; dragGroupOver.current = null; dragType.current = null
  }

  // 아이템 드래그 정렬 + 폴더 이동
  function handlePlaceDragStart(placeId: string, groupKey: string) {
    dragType.current = 'place'
    dragPlaceItem.current = placeId
    dragPlaceGroupKey.current = groupKey
  }
  function handlePlaceDragOverPlace(e: React.DragEvent, placeId: string) {
    e.preventDefault()
    if (dragType.current !== 'place') return
    dragPlaceOver.current = placeId
  }
  function handlePlaceDragOverFolder(e: React.DragEvent, groupId: string) {
    e.preventDefault()
    if (dragType.current !== 'place') return
    setDropTargetGroup(groupId)
  }
  function handlePlaceDropOnFolder(groupId: string) {
    if (dragType.current !== 'place' || !dragPlaceItem.current) return
    updatePlaceGroup.mutate({ id: dragPlaceItem.current, groupId })
    dragPlaceItem.current = null; dragPlaceGroupKey.current = null; dragType.current = null
    setDropTargetGroup(null)
  }
  function handlePlaceDropOnPlace(groupKey: string) {
    if (dragType.current !== 'place') return
    if (!dragPlaceItem.current || !dragPlaceOver.current) return
    if (dragPlaceGroupKey.current !== groupKey) {
      // 다른 폴더로 이동
      const targetGroupId = groupKey === 'ungrouped' ? null : groupKey
      updatePlaceGroup.mutate({ id: dragPlaceItem.current, groupId: targetGroupId })
    } else if (dragPlaceItem.current !== dragPlaceOver.current) {
      // 같은 폴더 내 순서 변경
      const list = groupKey === 'ungrouped' ? ungrouped : getSortedPlaces(groupKey, places.filter(p => p.group_id === groupKey))
      const order = list.map(p => p.id)
      const from = order.indexOf(dragPlaceItem.current!)
      const to = order.indexOf(dragPlaceOver.current!)
      if (from !== -1 && to !== -1) {
        order.splice(from, 1); order.splice(to, 0, dragPlaceItem.current!)
        const next = { ...placeOrders, [groupKey]: order }
        setPlaceOrders(next)
        localStorage.setItem('saved_place_orders', JSON.stringify(next))
      }
    }
    dragPlaceItem.current = null; dragPlaceOver.current = null; dragPlaceGroupKey.current = null; dragType.current = null
    setDropTargetGroup(null)
  }
  function handleDragEnd() {
    dragType.current = null; dragGroupItem.current = null; dragGroupOver.current = null
    dragPlaceItem.current = null; dragPlaceOver.current = null; dragPlaceGroupKey.current = null
    setDropTargetGroup(null)
  }

  // 메모 편집
  function startEdit(place: SavedPlace, e: React.MouseEvent) { e.stopPropagation(); setEditingId(place.id); setEditMemo(place.memo || '') }
  function saveEdit(place: SavedPlace, e: React.MouseEvent) { e.stopPropagation(); updatePlace.mutate({ id: place.id, memo: editMemo }); setEditingId(null) }
  function cancelEdit(e: React.MouseEvent) { e.stopPropagation(); setEditingId(null) }

  const mapCenter = selected
    ? { lat: selected.lat, lng: selected.lng }
    : places.length > 0 ? { lat: places[0].lat, lng: places[0].lng }
    : { lat: 37.5665, lng: 126.9780 }

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-400" size={28} /></div>

  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden border-r border-gray-100 bg-white relative">

        {/* 분류 삭제 확인 팝업 */}
        {deleteTarget && (
          <div className="absolute inset-0 bg-black/30 z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-xl shadow-xl p-5 w-full">
              <p className="text-sm font-semibold text-gray-900 mb-1">"{deleteTarget.name}" 삭제</p>
              <p className="text-xs text-gray-500 mb-4">이 분류 안의 장소를 어떻게 처리할까요?</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { deleteGroup.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  className="w-full py-2.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  분류만 삭제 (장소는 미분류로 이동)
                </button>
                <button
                  onClick={() => { deleteGroupWithPlaces.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  className="w-full py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  전체 삭제 (장소도 함께 삭제)
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">
            내 장소 <span className="text-gray-400 font-normal">({(searchQuery.trim() || filterCompanion) ? visiblePlaces.length + '/' : ''}{places.length})</span>
          </p>
          <button onClick={() => setCreatingGroup(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
            <FolderPlus size={14} /> 새 분류
          </button>
        </div>

        {/* 검색 */}
        <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-300 transition-all">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="장소명, 주소 검색"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 동행인 필터 */}
        {allCompanions.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto flex-shrink-0 scrollbar-none">
            <Users size={12} className="text-gray-300 flex-shrink-0" />
            {allCompanions.map(c => (
              <button
                key={c}
                onClick={() => setFilterCompanion(prev => prev === c ? null : c)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterCompanion === c
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* 새 분류 입력 */}
        {creatingGroup && (
          <div className="px-4 py-2 border-b border-gray-100 flex gap-2 flex-shrink-0">
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newGroupName.trim() && createGroup.mutate(newGroupName.trim(), { onSuccess: () => { setNewGroupName(''); setCreatingGroup(false) } })}
              placeholder="분류 이름"
              autoFocus
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
            />
            <button
              onClick={() => newGroupName.trim() && createGroup.mutate(newGroupName.trim(), { onSuccess: () => { setNewGroupName(''); setCreatingGroup(false) } })}
              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              만들기
            </button>
            <button onClick={() => { setCreatingGroup(false); setNewGroupName('') }} className="px-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <MapPin size={32} className="opacity-40" />
              <p className="text-sm">저장된 장소가 없습니다</p>
              <p className="text-xs">중간지점 탭에서 마음에 드는 곳을 저장해보세요</p>
            </div>
          ) : (
            <>
              {/* 미분류 */}
              {ungrouped.length > 0 && (
                <div className="border-b border-gray-50">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleGroup('ungrouped')}
                  >
                    {isGroupOpen('ungrouped') ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
                    <span className="text-xs text-gray-400 font-medium flex-1">미분류</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{ungrouped.length}</span>
                  </div>
                  {isGroupOpen('ungrouped') && (
                  <div className="px-3 pb-2 flex flex-col gap-1.5">
                    {ungrouped.map(place => (
                      <PlaceCard
                        key={place.id} place={place} groupKey="ungrouped"
                        selected={selected?.id === place.id} editingId={editingId} editMemo={editMemo}
                        onSelect={() => setSelected(place.id === selected?.id ? null : place)}
                        onStartEdit={e => startEdit(place, e)}
                        onSaveEdit={e => saveEdit(place, e)}
                        onCancelEdit={cancelEdit}
                        onEditMemoChange={setEditMemo}
                        onDelete={() => deletePlace.mutate(place.id)}
                        onDragStart={() => handlePlaceDragStart(place.id, 'ungrouped')}
                        onDragOver={e => handlePlaceDragOverPlace(e, place.id)}
                        onDrop={() => handlePlaceDropOnPlace('ungrouped')}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                  )}
                </div>
              )}

              {/* 분류 폴더들 */}
              {sortedGroups.map(group => {
                const open = isGroupOpen(group.id)
                const groupPlaces = getSortedPlaces(group.id, visiblePlaces.filter(p => p.group_id === group.id))
                const isDropTarget = dropTargetGroup === group.id
                return (
                  <div
                    key={group.id}
                    className="border-b border-gray-50"
                    onDragOver={e => { handleGroupDragOver(e, group.id); handlePlaceDragOverFolder(e, group.id) }}
                    onDrop={() => { handleGroupDrop(); handlePlaceDropOnFolder(group.id) }}
                  >
                    {/* 폴더 헤더 */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${isDropTarget ? 'bg-blue-50 border-l-2 border-blue-400' : ''}`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div
                        draggable
                        onDragStart={() => handleGroupDragStart(group.id)}
                        onDragEnd={handleDragEnd}
                        onClick={e => e.stopPropagation()}
                        className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                      >
                        <GripVertical size={14} />
                      </div>
                      {open ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">{group.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{groupPlaces.length}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(group) }}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        title="분류 삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* 폴더 내 아이템 */}
                    {open && (
                      <div className="px-3 pb-2 flex flex-col gap-1.5 bg-gray-50/50">
                        {groupPlaces.length === 0 ? (
                          <p className="text-xs text-gray-300 text-center py-3">장소를 드래그해서 이 분류에 넣으세요</p>
                        ) : (
                          groupPlaces.map(place => (
                            <PlaceCard
                              key={place.id} place={place} groupKey={group.id}
                              selected={selected?.id === place.id} editingId={editingId} editMemo={editMemo}
                              onSelect={() => setSelected(place.id === selected?.id ? null : place)}
                              onStartEdit={e => startEdit(place, e)}
                              onSaveEdit={e => saveEdit(place, e)}
                              onCancelEdit={cancelEdit}
                              onEditMemoChange={setEditMemo}
                              onDelete={() => deletePlace.mutate(place.id)}
                              onDragStart={() => handlePlaceDragStart(place.id, group.id)}
                              onDragOver={e => handlePlaceDragOverPlace(e, place.id)}
                              onDrop={() => handlePlaceDropOnPlace(group.id)}
                              onDragEnd={handleDragEnd}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
          <div className="h-20 flex-shrink-0" />
        </div>
      </div>

      <div className="flex-1">
        <KakaoMap
          center={mapCenter}
          markers={visiblePlaces.map(p => ({ lat: p.lat, lng: p.lng, label: p.name }))}
          zoom={selected ? 15 : 12}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

type PlaceCardProps = {
  place: SavedPlace; groupKey: string; selected: boolean
  editingId: string | null; editMemo: string
  onSelect: () => void
  onStartEdit: (e: React.MouseEvent) => void
  onSaveEdit: (e: React.MouseEvent) => void
  onCancelEdit: (e: React.MouseEvent) => void
  onEditMemoChange: (v: string) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function PlaceCard({ place, selected, editingId, editMemo, onSelect, onStartEdit, onSaveEdit, onCancelEdit, onEditMemoChange, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }: PlaceCardProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={e => { e.stopPropagation(); onDrop() }}
      onClick={onSelect}
      className={`bg-white rounded-lg border px-3 py-2.5 cursor-pointer transition-all shadow-sm flex items-start gap-2 ${selected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div
        draggable
        onDragStart={e => { e.stopPropagation(); onDragStart() }}
        onDragEnd={onDragEnd}
        onClick={e => e.stopPropagation()}
        className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
      >
        <GripVertical size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_COLOR[place.category] ?? CATEGORY_COLOR['기타']}`}>
            {place.category}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</p>

        {editingId === place.id ? (
          <div className="mt-2 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            <textarea
              value={editMemo} onChange={e => onEditMemoChange(e.target.value)}
              placeholder="메모 입력..." rows={2} autoFocus
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
            />
            <div className="flex gap-1">
              <button onClick={onSaveEdit} className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"><Check size={11} /> 저장</button>
              <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200"><X size={11} /> 취소</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1 group/memo">
            {place.memo ? <p className="text-xs text-gray-600 flex-1">"{place.memo}"</p> : <p className="text-xs text-gray-300 flex-1 italic">메모 없음</p>}
            <button onClick={onStartEdit} className="opacity-0 group-hover/memo:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-all flex-shrink-0"><Pencil size={11} /></button>
          </div>
        )}

        {place.companions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Tag size={11} className="text-gray-400" />
            {place.companions.map(c => <span key={c} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>)}
          </div>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
