import { useState, useRef } from 'react'
import { MapPin, Trash2, Tag, Loader2, Pencil, Check, X, ChevronDown, ChevronRight, FolderPlus, Folder } from 'lucide-react'
import {
  useSavedPlaces, useDeletePlace, useUpdatePlace, useUpdatePlaceGroup,
  usePlaceGroups, useCreateGroup, useDeleteGroup,
} from '../hooks/useSavedPlaces'
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
  const { data: groups = [] } = usePlaceGroups()
  const deletePlace = useDeletePlace()
  const updatePlace = useUpdatePlace()
  const updatePlaceGroup = useUpdatePlaceGroup()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()

  const [selected, setSelected] = useState<SavedPlace | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMemo, setEditMemo] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [dragTarget, setDragTarget] = useState<string | 'ungrouped' | null>(null)
  const draggingId = useRef<string | null>(null)

  const ungrouped = places.filter(p => !p.group_id)
  const grouped = groups.map(g => ({ group: g, places: places.filter(p => p.group_id === g.id) }))

  const mapCenter = selected
    ? { lat: selected.lat, lng: selected.lng }
    : places.length > 0 ? { lat: places[0].lat, lng: places[0].lng }
    : { lat: 37.5665, lng: 126.9780 }
  const markers = places.map(p => ({ lat: p.lat, lng: p.lng, label: p.name }))

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
    createGroup.mutate(newGroupName.trim())
    setNewGroupName('')
    setCreatingGroup(false)
  }

  function handleDragStart(placeId: string) {
    draggingId.current = placeId
  }

  function handleDragOver(e: React.DragEvent, target: string | 'ungrouped') {
    e.preventDefault()
    setDragTarget(target)
  }

  function handleDrop(groupId: string | null) {
    if (!draggingId.current) return
    updatePlaceGroup.mutate({ id: draggingId.current, groupId })
    draggingId.current = null
    setDragTarget(null)
  }

  function handleDragEnd() {
    draggingId.current = null
    setDragTarget(null)
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
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">내 장소</p>
          <button
            onClick={() => setCreatingGroup(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            <FolderPlus size={14} /> 새 폴더
          </button>
        </div>

        {/* 새 폴더 입력 */}
        {creatingGroup && (
          <div className="px-4 py-2 border-b border-gray-100 flex gap-2 flex-shrink-0">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="폴더 이름"
              autoFocus
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
            />
            <button onClick={handleCreateGroup} className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">만들기</button>
            <button onClick={() => { setCreatingGroup(false); setNewGroupName('') }} className="px-2 py-1.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-16">
          {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <MapPin size={32} className="opacity-40" />
              <p className="text-sm">저장된 장소가 없습니다</p>
              <p className="text-xs">중간지점 탭에서 마음에 드는 곳을 저장해보세요</p>
            </div>
          ) : (
            <>
              {/* 미분류 */}
              <Section
                id="ungrouped"
                label="미분류"
                count={ungrouped.length}
                collapsed={collapsed.has('ungrouped')}
                onToggle={() => toggleCollapse('ungrouped')}
                isDragTarget={dragTarget === 'ungrouped'}
                onDragOver={(e) => handleDragOver(e, 'ungrouped')}
                onDragLeave={() => setDragTarget(null)}
                onDrop={() => handleDrop(null)}
              >
                {ungrouped.map(place => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    selected={selected?.id === place.id}
                    editingId={editingId}
                    editMemo={editMemo}
                    onSelect={() => setSelected(place.id === selected?.id ? null : place)}
                    onStartEdit={(e) => startEdit(place, e)}
                    onSaveEdit={(e) => saveEdit(place, e)}
                    onCancelEdit={cancelEdit}
                    onEditMemoChange={setEditMemo}
                    onDelete={() => deletePlace.mutate(place.id)}
                    onDragStart={() => handleDragStart(place.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </Section>

              {/* 그룹 폴더 */}
              {grouped.map(({ group, places: gPlaces }) => (
                <Section
                  key={group.id}
                  id={group.id}
                  label={group.name}
                  count={gPlaces.length}
                  collapsed={collapsed.has(group.id)}
                  onToggle={() => toggleCollapse(group.id)}
                  isDragTarget={dragTarget === group.id}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={() => handleDrop(group.id)}
                  onDeleteGroup={() => deleteGroup.mutate(group.id)}
                >
                  {gPlaces.map(place => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      selected={selected?.id === place.id}
                      editingId={editingId}
                      editMemo={editMemo}
                      onSelect={() => setSelected(place.id === selected?.id ? null : place)}
                      onStartEdit={(e) => startEdit(place, e)}
                      onSaveEdit={(e) => saveEdit(place, e)}
                      onCancelEdit={cancelEdit}
                      onEditMemoChange={setEditMemo}
                      onDelete={() => deletePlace.mutate(place.id)}
                      onDragStart={() => handleDragStart(place.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </Section>
              ))}
            </>
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

type SectionProps = {
  id: string
  label: string
  count: number
  collapsed: boolean
  onToggle: () => void
  isDragTarget: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
  onDeleteGroup?: () => void
  children: React.ReactNode
}

function Section({ id, label, count, collapsed, onToggle, isDragTarget, onDragOver, onDragLeave, onDrop, onDeleteGroup, children }: SectionProps) {
  return (
    <div className="border-b border-gray-50 last:border-0">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${isDragTarget ? 'bg-blue-50 border-l-2 border-blue-400' : 'hover:bg-gray-50'}`}
        onClick={onToggle}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop() }}
      >
        {collapsed ? <ChevronRight size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        {id !== 'ungrouped' && <Folder size={13} className="text-amber-400" />}
        <span className="text-xs font-medium text-gray-600 flex-1">{label}</span>
        <span className="text-xs text-gray-400">{count}</span>
        {onDeleteGroup && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteGroup() }}
            className="p-1 text-gray-300 hover:text-red-400 transition-colors"
            title="폴더 삭제 (장소는 미분류로 이동)"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {!collapsed && <div className="px-2 pb-2 flex flex-col gap-1.5">{children}</div>}
    </div>
  )
}

type PlaceCardProps = {
  place: SavedPlace
  selected: boolean
  editingId: string | null
  editMemo: string
  onSelect: () => void
  onStartEdit: (e: React.MouseEvent) => void
  onSaveEdit: (e: React.MouseEvent) => void
  onCancelEdit: (e: React.MouseEvent) => void
  onEditMemoChange: (v: string) => void
  onDelete: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function PlaceCard({ place, selected, editingId, editMemo, onSelect, onStartEdit, onSaveEdit, onCancelEdit, onEditMemoChange, onDelete, onDragStart, onDragEnd }: PlaceCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`bg-white rounded-lg border px-3 py-2.5 cursor-pointer transition-all shadow-sm ${selected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div className="flex items-start gap-2">
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
                onChange={(e) => onEditMemoChange(e.target.value)}
                placeholder="메모 입력..."
                rows={2}
                autoFocus
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex gap-1">
                <button onClick={onSaveEdit} className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600">
                  <Check size={11} /> 저장
                </button>
                <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200">
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
                onClick={onStartEdit}
                className="opacity-0 group-hover/memo:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-all flex-shrink-0"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}

          {place.companions.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Tag size={11} className="text-gray-400" />
              {place.companions.map((c) => (
                <span key={c} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
