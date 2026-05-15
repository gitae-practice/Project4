import type { KakaoPlace } from '../types'

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY

// 공통 fetch 헬퍼 — 중복 제거
async function kakaoFetch(endpoint: string, params: URLSearchParams): Promise<any> {
  const res = await fetch(`/kakao-api${endpoint}?${params}`, {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
  })
  if (!res.ok) throw new Error(`카카오 API 오류: ${res.status}`)
  return res.json()
}

// 카테고리 코드 상수
export const CATEGORY = {
  RESTAURANT: 'FD6',
  CAFE: 'CE7',
  BAR: 'PO3',
} as const

// 주소/키워드 → 좌표 변환 (주소 검색 → 실패 시 키워드 검색 폴백)
export async function geocode(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const params = new URLSearchParams({ query })

  const addressData = await kakaoFetch('/v2/local/search/address.json', params)
  if (addressData.documents.length) {
    const doc = addressData.documents[0]
    return { lat: Number(doc.y), lng: Number(doc.x), name: doc.address_name }
  }

  // 주소 검색 실패 → 키워드 검색으로 폴백
  const keywordData = await kakaoFetch('/v2/local/search/keyword.json', params)
  if (!keywordData.documents.length) return null
  const doc = keywordData.documents[0]
  return { lat: Number(doc.y), lng: Number(doc.x), name: doc.place_name }
}

// 카테고리별 주변 장소 검색
export async function searchByCategory(
  categoryCode: string,
  lat: number,
  lng: number,
  radius = 1500
): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({
    category_group_code: categoryCode,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    size: '15',
    sort: 'distance',
  })
  const data = await kakaoFetch('/v2/local/search/category.json', params)
  return data.documents
}

// 결과 없으면 반경을 단계적으로 넓혀서 재검색
export async function searchByCategoryWithFallback(
  categoryCode: string,
  lat: number,
  lng: number
): Promise<{ places: KakaoPlace[]; radius: number }> {
  for (const radius of [1500, 3000, 5000, 10000]) {
    const places = await searchByCategory(categoryCode, lat, lng, radius)
    if (places.length > 0) return { places, radius }
  }
  return { places: [], radius: 10000 }
}

// 키워드로 장소 검색
export async function searchKeyword(
  query: string,
  lat?: number,
  lng?: number,
  radius = 2000
): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({ query, size: '8' })
  if (lat !== undefined && lng !== undefined) {
    params.set('x', String(lng))
    params.set('y', String(lat))
    params.set('radius', String(radius))
    params.set('sort', 'distance')
  }
  const data = await kakaoFetch('/v2/local/search/keyword.json', params)
  return data.documents
}

// 카카오 모빌리티 길찾기 — 최대 3개 경로 반환
export type RouteOption = {
  priority: string
  label: string
  duration: number   // 초
  distance: number   // 미터
  path: { lat: number; lng: number }[]
}

export async function getDirections(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<RouteOption[]> {
  const params = new URLSearchParams({
    origin: `${origin.lng},${origin.lat}`,
    destination: `${dest.lng},${dest.lat}`,
    alternatives: 'true',
    priority: 'RECOMMEND',
  })
  const res = await fetch(`/kakao-navi/v1/directions?${params}`, {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
  })
  if (!res.ok) throw new Error(`길찾기 오류: ${res.status}`)
  const data = await res.json()

  const LABELS: Record<string, string> = { RECOMMEND: '추천', TIME: '빠른길', DISTANCE: '최단거리' }

  return (data.routes as any[])
    .filter((r) => r.result_code === 0)
    .map((r) => {
      const path: { lat: number; lng: number }[] = []
      for (const section of r.sections) {
        for (const road of section.roads) {
          const v: number[] = road.vertexes
          for (let i = 0; i < v.length; i += 2) {
            path.push({ lng: v[i], lat: v[i + 1] })
          }
        }
      }
      return {
        priority: r.summary.priority,
        label: LABELS[r.summary.priority] ?? r.summary.priority,
        duration: r.summary.duration,
        distance: r.summary.distance,
        path,
      }
    })
}

// 여러 좌표의 중간지점 계산 (위도/경도 평균)
export function calcMidpoint(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}
