export type PlaceCategory = '음식점' | '카페' | '주점' | '기타' | '편의점' | '관광명소' | '문화시설' | '지하철역'

export type PlaceGroup = {
  id: string
  name: string
  order_index: number
  created_at: string
}

export type SavedPlace = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  memo: string
  companions: string[]
  category: PlaceCategory
  group_id: string | null
  created_at: string
}

export type Route = {
  id: string
  label: string
  origin_name: string
  origin_lat: number
  origin_lng: number
  dest_name: string
  dest_lat: number
  dest_lng: number
  created_at: string
}

export type LocationShare = {
  id: string
  share_code: string
  lat: number
  lng: number
  label: string
  updated_at: string
  created_at: string
}

export type KakaoPlace = {
  id: string
  place_name: string
  category_name: string
  address_name: string
  road_address_name: string
  phone: string
  x: string
  y: string
  place_url: string
}

export type WeatherData = {
  temp: number
  feels_like: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
  city: string
}
