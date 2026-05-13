// OpenWeatherMap API — 좌표 기반 현재 날씨 조회
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY

export async function getWeather(lat: number, lng: number) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=kr`
  )
  if (!res.ok) throw new Error('날씨 조회 실패')
  const d = await res.json()
  return {
    temp: Math.round(d.main.temp),
    feels_like: Math.round(d.main.feels_like),
    description: d.weather[0].description,
    icon: d.weather[0].icon,
    humidity: d.main.humidity,
    wind_speed: d.wind.speed,
    city: d.name,
  }
}
