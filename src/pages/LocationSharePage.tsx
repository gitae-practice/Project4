import { useState } from 'react'
import { Navigation, Copy, StopCircle, Loader2, MapPin } from 'lucide-react'
import { useShareLocation, useWatchLocation } from '../hooks/useLocationShare'
import KakaoMap from '../components/KakaoMap'

export default function LocationSharePage() {
  const [label, setLabel] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [watchCode, setWatchCode] = useState('')
  const [copied, setCopied] = useState(false)

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
    const url = `${window.location.origin}?share=${shareCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
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
              <button
                onClick={copyLink}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 transition-colors"
              >
                {copied ? '복사됨!' : <Copy size={13} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">링크를 상대방에게 전송하세요</p>
            <button
              onClick={handleStop}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm py-2.5 rounded-lg transition-colors"
            >
              <StopCircle size={14} /> 공유 중단
            </button>
          </div>
        )}
      </div>

      {/* 상대방 위치 확인 */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-800">상대방 위치 확인</p>
        <div className="flex gap-2">
          <input
            value={watchCode}
            onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
            placeholder="공유 코드 입력 (예: AB1C2D)"
            maxLength={6}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors font-mono tracking-widest"
          />
        </div>
        {notFound && <p className="text-xs text-red-500">코드를 찾을 수 없습니다</p>}
      </div>

      {/* 상대방 지도 */}
      {location && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-xs text-gray-500">{location.label || '이동 중'}</p>
          </div>
          <KakaoMap
            center={{ lat: location.lat, lng: location.lng }}
            markers={[{ lat: location.lat, lng: location.lng, label: '상대방 위치' }]}
            zoom={15}
            className="w-full h-64 rounded-lg overflow-hidden border border-gray-100"
          />
          <p className="text-xs text-gray-400 text-center">
            마지막 업데이트: {new Date(location.updated_at).toLocaleTimeString('ko-KR')}
          </p>
        </div>
      )}

      {!location && watchCode.length === 6 && !notFound && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin text-blue-400" />
          <p className="text-sm text-gray-400">위치 불러오는 중...</p>
        </div>
      )}

      {!shareCode && !watchCode && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300">
          <MapPin size={36} />
          <p className="text-sm">공유를 시작하거나 코드를 입력하세요</p>
        </div>
      )}
    </div>
  )
}
