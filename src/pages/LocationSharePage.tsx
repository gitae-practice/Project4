import { useState } from 'react'
import { Navigation, Copy, StopCircle, Loader2, MapPin, LocateFixed } from 'lucide-react'
import { useShareLocation, useWatchLocation } from '../hooks/useLocationShare'
import type { NavPoint } from '../App'
import KakaoMap from '../components/KakaoMap'

type Props = { onNavigateToMidpoint: (points: NavPoint[]) => void }

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }

export default function LocationSharePage({ onNavigateToMidpoint }: Props) {
  const [label, setLabel] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [watchCode, setWatchCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const { shareCode, error: shareError, start, stop } = useShareLocation()
  const { location, notFound } = useWatchLocation(watchCode)

  async function handleStart() {
    setIsSharing(true)
    await start(label || '이동 중')
  }

  async function handleStop() {
    await stop()
    setIsSharing(false)
    setLabel('')
  }

  function copyLink() {
    if (!shareCode) return
    navigator.clipboard.writeText(`${window.location.origin}?share=${shareCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  function handleGoMidpoint() {
    if (!myLocation || !location) return
    onNavigateToMidpoint([
      { name: '내 위치', lat: myLocation.lat, lng: myLocation.lng },
      { name: location.label || '상대방', lat: location.lat, lng: location.lng },
    ])
  }

  const mapCenter = location ? { lat: location.lat, lng: location.lng } : DEFAULT_CENTER
  const mapMarkers = [
    ...(location ? [{ lat: location.lat, lng: location.lng, label: location.label || '상대방 위치' }] : []),
    ...(myLocation ? [{ lat: myLocation.lat, lng: myLocation.lng, label: '내 위치' }] : []),
  ]

  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0 flex flex-col overflow-y-auto border-r border-gray-100 bg-gray-50 p-4 gap-4">
        {/* 내 위치 공유 */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-800 mb-3">내 위치 공유</p>
          {!shareCode ? (
            <div className="flex flex-col gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="메시지 (예: 지금 OO역 지나는 중)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={handleStart}
                disabled={isSharing}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                공유 시작
              </button>
              {shareError && <p className="text-xs text-red-500">{shareError}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-sm text-blue-700 font-mono truncate">
                  {window.location.origin}?share={shareCode}
                </p>
                <button onClick={copyLink} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 transition-colors">
                  {copied ? '복사됨!' : <Copy size={13} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">링크를 상대방에게 전송하세요</p>
              <button onClick={handleStop} className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm py-2.5 rounded-lg transition-colors">
                <StopCircle size={14} /> 공유 중단
              </button>
            </div>
          )}
        </div>

        {/* 상대방 위치 확인 */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-800">상대방 위치 확인</p>
          <input
            value={watchCode}
            onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
            placeholder="공유 코드 입력 (예: AB1C2D)"
            maxLength={6}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors font-mono tracking-widest"
          />
          {notFound && <p className="text-xs text-red-500">코드를 찾을 수 없습니다</p>}
        </div>

        {/* 중간지점 찾기 — 상대방 위치 확인된 경우만 표시 */}
        {location && (
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-800">중간지점 찾기</p>
            <button
              onClick={getMyLocation}
              disabled={locating}
              className={`flex items-center justify-center gap-2 text-sm py-2 rounded-lg border transition-colors ${
                myLocation
                  ? 'border-green-300 text-green-600 bg-green-50'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-500'
              }`}
            >
              {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
              {myLocation ? '내 위치 확인됨' : '내 현재 위치 가져오기'}
            </button>
            <button
              onClick={handleGoMidpoint}
              disabled={!myLocation}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm py-2.5 rounded-lg transition-colors"
            >
              <MapPin size={14} /> 중간지점 찾기
            </button>
            {!myLocation && <p className="text-xs text-gray-400 text-center">내 위치를 먼저 가져오세요</p>}
          </div>
        )}

        {/* 상태 표시 */}
        {location && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-xs text-gray-500">{location.label || '이동 중'}</p>
            <p className="text-xs text-gray-400 ml-auto">
              {new Date(location.updated_at).toLocaleTimeString('ko-KR')}
            </p>
          </div>
        )}

        {!location && watchCode.length === 6 && !notFound && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={14} className="animate-spin text-blue-400" />
            <p className="text-sm text-gray-400">위치 불러오는 중...</p>
          </div>
        )}

        {!shareCode && !watchCode && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 py-8">
            <MapPin size={32} />
            <p className="text-sm">공유를 시작하거나 코드를 입력하세요</p>
          </div>
        )}
        <div className="h-20 flex-shrink-0" />
      </div>

      <div className="flex-1 relative">
        <KakaoMap
          center={mapCenter}
          markers={mapMarkers}
          zoom={location ? 13 : 11}
          className="w-full h-full"
        />
        {!location && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-100 pointer-events-none">
            <p className="text-xs text-gray-500 whitespace-nowrap">상대방 코드를 입력하면 위치가 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
