import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MapPin, Bookmark, Route, Navigation } from 'lucide-react'
import MidpointPage from './pages/MidpointPage'
import SavedPlacesPage from './pages/SavedPlacesPage'
import RoutesPage from './pages/RoutesPage'
import LocationSharePage from './pages/LocationSharePage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
})

const TABS = [
  { id: 'midpoint', label: '중간지점', Icon: MapPin },
  { id: 'saved', label: '내 장소', Icon: Bookmark },
  { id: 'routes', label: '경로', Icon: Route },
  { id: 'share', label: '위치공유', Icon: Navigation },
] as const

type TabId = typeof TABS[number]['id']

function AppContent() {
  const [tab, setTab] = useState<TabId>('midpoint')

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 헤더 */}
      <header className="flex-shrink-0 px-6 py-3 border-b border-gray-100 bg-white">
        <h1 className="text-base font-semibold text-gray-900">중간어디</h1>
      </header>

      {/* 페이지 콘텐츠 */}
      <main className="flex-1 min-h-0 overflow-hidden bg-gray-50">
        {tab === 'midpoint' && <MidpointPage />}
        {tab === 'saved' && <SavedPlacesPage />}
        {tab === 'routes' && <RoutesPage />}
        {tab === 'share' && <LocationSharePage />}
      </main>

      {/* 하단 탭 바 */}
      <nav className="flex-shrink-0 flex w-96 border-t border-r border-gray-100 bg-white">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              tab === id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={18} strokeWidth={tab === id ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
