# 중간어디

약속 장소 중간지점 찾기, 장소 저장, 경로 관리, 실시간 위치 공유를 하나로 묶은 약속 도우미 웹앱.

## 주요 기능

- **중간지점 찾기** — 출발지 2개 이상 입력 시 중간지점 계산, 주변 음식점·카페·주점 검색
- **내 장소** — 마음에 든 장소 북마크 저장, 카카오 지도로 한눈에 확인
- **경로 관리** — 자주 가는 경로 저장, 교통수단별 내비 경로 표시 (자동차/도보/자전거)
- **위치 공유** — GPS 위치를 Supabase Realtime으로 실시간 공유 (6자리 코드)

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite |
| 스타일 | Tailwind CSS v4 |
| 서버 상태 | TanStack Query |
| 지도 / 경로 | Kakao Maps SDK, Kakao Local API, Kakao Mobility API |
| 날씨 | OpenWeatherMap API |
| DB / Realtime | Supabase (PostgreSQL + Realtime) |

## 환경변수

```
VITE_KAKAO_APP_KEY=     # 카카오 JavaScript 키
VITE_KAKAO_REST_KEY=    # 카카오 REST API 키
VITE_WEATHER_API_KEY=   # OpenWeatherMap API 키
VITE_SUPABASE_URL=      # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY= # Supabase anon key
```

## DB 설정

`supabase_schema.sql` 파일을 Supabase SQL Editor에서 실행하면 필요한 테이블이 생성됩니다.

## 실행 방법

```bash
npm install
npm run dev
```
