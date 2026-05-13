# Project4 — 중간어디 개발 노트

## 앱 개요
약속 장소 중간지점 찾기, 장소 저장, 자주 가는 경로 날씨 확인, 실시간 위치 공유를 하나로 묶은 약속 도우미 앱.

## 기술 스택
- React 19 + TypeScript (Vite)
- Kakao Maps JavaScript API — 지도 표시
- Kakao Local REST API — 주소 검색, 주변 장소 검색
- OpenWeatherMap API — 도착지 날씨
- Supabase (PostgreSQL + Realtime) — 장소/경로 저장, 위치 공유
- Tailwind CSS v4
- @tanstack/react-query
- Lucide React

## API 키 목록
| 변수명 | 용도 |
|---|---|
| VITE_KAKAO_APP_KEY | 카카오 지도 JavaScript 키 |
| VITE_KAKAO_REST_KEY | 카카오 로컬 REST API |
| VITE_WEATHER_API_KEY | OpenWeatherMap |
| VITE_SUPABASE_URL | Supabase 프로젝트 URL |
| VITE_SUPABASE_ANON_KEY | Supabase anon key |

## DB 스키마
```sql
saved_places  (id, name, address, lat, lng, memo, companions[], category, created_at)
routes        (id, label, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, created_at)
location_shares (id, share_code, lat, lng, label, updated_at, created_at)
```
- RLS: public access 정책 (인증 없이 전체 접근)

## 파일 구조
```
src/
  lib/
    supabase.ts       Supabase 클라이언트
    kakao.ts          카카오 API 공통 fetch 헬퍼 + geocode + 장소검색
    weather.ts        OpenWeatherMap 날씨 조회
  types/index.ts      SavedPlace, Route, LocationShare, KakaoPlace, WeatherData
  hooks/
    useSavedPlaces.ts 장소 CRUD
    useRoutes.ts      경로 CRUD
    useLocationShare.ts 위치 공유 (watchPosition + Supabase Realtime)
  components/
    KakaoMap.tsx      지도 컴포넌트 (마커, 중심 이동)
  pages/
    MidpointPage.tsx  중간지점 찾기 + 주변 장소 검색 + 저장
    SavedPlacesPage.tsx 저장 장소 목록 + 지도
    RoutesPage.tsx    자주 가는 경로 + 날씨 조회
    LocationSharePage.tsx 실시간 위치 공유
  App.tsx             탭 네비게이션
```

## 구현된 기능
- [x] 출발지 2개 이상 입력 → 중간지점 계산 → 지도 표시
- [x] 중간지점 주변 음식점/카페/주점 검색
- [x] 마음에 드는 장소 저장 (감상, 동행자 태그)
- [x] 저장 장소 지도로 모아보기
- [x] 자주 가는 경로 저장
- [x] 도착지 날씨 조회 (OpenWeatherMap)
- [x] 실시간 위치 공유 링크 생성 (Supabase Realtime)
- [x] 공유 코드로 상대방 위치 지도에서 실시간 확인

## 위치 공유 로컬 테스트 방법
1. Tab1: 위치공유 탭 → 공유 시작 → 코드 복사
2. Tab2: 같은 앱 → 위치공유 탭 → 코드 입력
3. 두 탭이 같은 Supabase Realtime에 연결되어 실시간 반영됨

## 남은 작업
- [ ] 카카오 개발자 콘솔에서 localhost:5173 도메인 등록
- [ ] README.md 작성
