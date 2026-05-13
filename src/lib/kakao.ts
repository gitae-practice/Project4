import type { KakaoPlace } from '../types'

const REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY

// 공통 fetch 헬퍼 — 중복 제거
async function kakaoFetch(endpoint: string, params: URLSearchParams): Promise<any> {
  const res = await fetch(`https://dapi.kakao.com${endpoint}?${params}`, {
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

// 키워드로 장소 검색
export async function searchKeyword(
  query: string,
  lat: number,
  lng: number,
  radius = 2000
): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    size: '15',
    sort: 'distance',
  })
  const data = await kakaoFetch('/v2/local/search/keyword.json', params)
  return data.documents
}

// 여러 좌표의 중간지점 계산 (위도/경도 평균)
export function calcMidpoint(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}
