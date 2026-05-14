# 중간어디

약속 장소 중간지점 찾기, 장소 저장, 자주 가는 경로 날씨 확인, 실시간 위치 공유를 하나로 묶은 약속 도우미 웹앱.

## 주요 기능

### 중간지점 찾기
- 출발지 2개 이상 입력 → 좌표 평균으로 중간지점 계산
- 중간지점 주변 음식점 / 카페 / 주점 카카오 Local API로 검색
- 마음에 드는 장소 북마크 저장 (중복 저장 방지, 저장 여부 아이콘으로 표시)

### 내 장소
- 저장한 장소 카드 목록 + 카카오 지도로 한눈에 확인
- 카드 클릭 시 해당 장소로 지도 포커스 이동
- 카테고리 태그(음식점 / 카페 / 주점), 메모, 동행자 태그 표시

### 경로 관리
- 자주 가는 경로(출발지 → 도착지) 저장
- 출발지·도착지 입력 시 실시간 자동완성 (카카오 키워드 검색)
- 경로 선택 시 지도에 출발·도착 마커 표시
- 도착지 현재 날씨 조회 (OpenWeatherMap)

### 실시간 위치 공유
- GPS 위치를 Supabase Realtime으로 실시간 브로드캐스트
- 6자리 공유 코드 생성 → 링크 복사해 상대방에게 전송
- 상대방 코드 입력 시 지도에 위치 실시간 반영

## 기술 스택

| 분류 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite |
| 스타일 | Tailwind CSS v4 |
| 서버 상태 | @tanstack/react-query |
| 지도 | Kakao Maps JavaScript SDK |
| 장소 검색 | Kakao Local REST API |
| 날씨 | OpenWeatherMap API |
| DB / Realtime | Supabase (PostgreSQL + Realtime) |
| 아이콘 | Lucide React |

## 환경 변수

`.env` 파일을 루트에 생성하고 아래 키를 입력
```
VITE_KAKAO_APP_KEY=     # 카카오 JavaScript 키
VITE_KAKAO_REST_KEY=    # 카카오 REST API 키
VITE_WEATHER_API_KEY=   # OpenWeatherMap API 키
VITE_SUPABASE_URL=      # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY= # Supabase anon key
```

## Supabase 테이블 설정

Supabase SQL 에디터에서 아래 쿼리를 실행

```sql
create table saved_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  memo text default '',
  companions text[] default '{}',
  category text default '기타',
  created_at timestamptz default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_name text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  created_at timestamptz default now()
);

create table location_shares (
  id uuid primary key default gen_random_uuid(),
  share_code text unique not null,
  lat double precision not null,
  lng double precision not null,
  label text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS: 인증 없이 전체 접근 허용
alter table saved_places enable row level security;
alter table routes enable row level security;
alter table location_shares enable row level security;

create policy "public access" on saved_places for all using (true) with check (true);
create policy "public access" on routes for all using (true) with check (true);
create policy "public access" on location_shares for all using (true) with check (true);
```

## 카카오 개발자 콘솔 설정

1. [developers.kakao.com](https://developers.kakao.com) → 내 애플리케이션 → 앱 생성
2. **플랫폼 키 → JavaScript 키 → JS SDK 도메인**에 `http://localhost:5173` 등록
3. **제품 설정 → 카카오맵** 활성화

## 로컬 실행

```bash
npm install
npm run dev
```

## 위치 공유 로컬 테스트

1. 탭 1: 위치공유 탭 → 공유 시작 → 코드 복사
2. 탭 2: 같은 앱 → 위치공유 탭 → 코드 입력
3. 두 탭이 동일한 Supabase Realtime에 연결되어 실시간 반영
