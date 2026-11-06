/**
 * Weather Service for HCM Application
 * -------------------------------------
 * Provides accurate, localized real-time weather information using:
 * 1. Primary: Official BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) Open API
 * 2. Fallback: Open-Meteo with precipitation guard (prevents false "Hujan Ringan" in tropics)
 * 3. Geolocation & Office Coordinates support
 */

export interface WeatherInfo {
  temp: number;
  condition: string;
  city: string;
  source: 'BMKG' | 'Open-Meteo' | 'Cache' | 'Fallback';
  iconType: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'thunder' | 'fog';
  updatedAt: number;
}

interface BMKGRegion {
  name: string;
  cityLabel: string;
  adm4: string;
  lat: number;
  lon: number;
}

// Major Indonesian business and urban hubs mapped to official BMKG adm4 codes
const BMKG_REGIONS: BMKGRegion[] = [
  // Jakarta Pusat (Menteng - The City Tower / HQ area)
  { name: 'Jakarta Pusat', cityLabel: 'Jakarta', adm4: '31.71.06.1001', lat: -6.2008, lon: 106.8339 },
  // Jakarta Selatan (Kebayoran / Kuningan / Cilandak)
  { name: 'Jakarta Selatan', cityLabel: 'Jakarta', adm4: '31.74.04.1001', lat: -6.2412, lon: 106.8000 },
  // Jakarta Barat (Grogol / Sircon)
  { name: 'Jakarta Barat', cityLabel: 'Jakarta', adm4: '31.73.02.1001', lat: -6.1674, lon: 106.7869 },
  // Jakarta Timur (Pulogadung / Jengki / Halim)
  { name: 'Jakarta Timur', cityLabel: 'Jakarta', adm4: '31.75.02.1001', lat: -6.1942, lon: 106.9004 },
  // Jakarta Utara (Kelapa Gading / Tanjung Priok)
  { name: 'Jakarta Utara', cityLabel: 'Jakarta', adm4: '31.72.02.1001', lat: -6.1158, lon: 106.8831 },
  // Greater Jakarta (Bodeta)
  { name: 'Tangerang', cityLabel: 'Tangerang', adm4: '36.71.01.1001', lat: -6.1783, lon: 106.6319 },
  { name: 'Tangerang Selatan', cityLabel: 'Tangsel', adm4: '36.74.03.1001', lat: -6.2888, lon: 106.7179 },
  { name: 'Bekasi', cityLabel: 'Bekasi', adm4: '32.75.01.1001', lat: -6.2383, lon: 106.9756 },
  { name: 'Depok', cityLabel: 'Depok', adm4: '32.76.01.1001', lat: -6.4025, lon: 106.7942 },
  { name: 'Bogor', cityLabel: 'Bogor', adm4: '32.71.01.1001', lat: -6.5971, lon: 106.8060 },
  // Major Indonesian Cities
  { name: 'Bandung', cityLabel: 'Bandung', adm4: '32.73.01.1001', lat: -6.9175, lon: 107.6191 },
  { name: 'Semarang', cityLabel: 'Semarang', adm4: '33.74.01.1001', lat: -6.9667, lon: 110.4167 },
  { name: 'Surabaya', cityLabel: 'Surabaya', adm4: '35.78.01.1001', lat: -7.2575, lon: 112.7521 },
  { name: 'Yogyakarta', cityLabel: 'Yogyakarta', adm4: '34.71.01.1001', lat: -7.7956, lon: 110.3695 },
  { name: 'Medan', cityLabel: 'Medan', adm4: '12.71.01.1001', lat: 3.5952, lon: 98.6722 },
  { name: 'Denpasar', cityLabel: 'Denpasar', adm4: '51.71.01.1001', lat: -8.6705, lon: 115.2126 },
  { name: 'Makassar', cityLabel: 'Makassar', adm4: '73.71.01.1001', lat: -5.1477, lon: 119.4327 }
];

// Default coordinates: The City Tower, Jakarta Pusat
export const DEFAULT_COORDINATES = {
  lat: -6.1991,
  lon: 106.8236,
  cityLabel: 'Jakarta'
};

const CACHE_KEY = 'gesit_weather_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Maps condition text to corresponding Lucide icon type
 */
function resolveIconType(condition: string): WeatherInfo['iconType'] {
  const lower = condition.toLowerCase();
  if (lower.includes('petir') || lower.includes('badai') || lower.includes('thunder')) {
    return 'thunder';
  }
  if (lower.includes('hujan') || lower.includes('rain') || lower.includes('gerimis') || lower.includes('drizzle')) {
    return 'rain';
  }
  if (lower.includes('kabut') || lower.includes('asap') || lower.includes('fog') || lower.includes('haze')) {
    return 'fog';
  }
  if (lower.includes('berawan tebal') || lower.includes('overcast')) {
    return 'cloud';
  }
  if (lower.includes('cerah berawan') || lower.includes('partly cloudy')) {
    return 'cloud-sun';
  }
  if (lower.includes('berawan') || lower.includes('cloudy')) {
    return 'cloud';
  }
  if (lower.includes('cerah') || lower.includes('sunny') || lower.includes('clear')) {
    return 'sun';
  }
  return 'cloud-sun';
}

/**
 * Fetches weather from official BMKG Open Data API
 */
async function fetchBMKGWeather(region: BMKGRegion): Promise<WeatherInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${region.adm4}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const rawCuaca = data?.data?.[0]?.cuaca;
    if (!rawCuaca || !Array.isArray(rawCuaca)) return null;

    // Flatten in case cuaca is nested [[...]] or [...]
    const cuacaList = rawCuaca.flat() as Array<{
      datetime?: string;
      t?: number;
      weather_desc?: string;
    }>;
    if (cuacaList.length === 0) return null;

    // Find entry closest to now
    const now = Date.now();
    let closest = cuacaList[0];
    let minDiff = Infinity;

    for (const item of cuacaList) {
      if (!item.datetime) continue;
      const itemTime = new Date(item.datetime).getTime();
      const diff = Math.abs(now - itemTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = item;
      }
    }

    if (closest.t === undefined || !closest.weather_desc) return null;

    const condition = closest.weather_desc.trim();
    const temp = Math.round(Number(closest.t));

    return {
      temp,
      condition,
      city: region.cityLabel,
      source: 'BMKG',
      iconType: resolveIconType(condition),
      updatedAt: Date.now()
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fallback to Open-Meteo with precipitation guard to prevent false rain reports
 */
async function fetchOpenMeteoWeather(lat: number, lon: number, cityLabel: string): Promise<WeatherInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover&models=icon_seamless,best_match`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;

    const temp = Math.round(Number(cur.temperature_2m ?? 31));
    const precip = Number(cur.precipitation ?? 0);
    const rain = Number(cur.rain ?? 0);
    const clouds = Number(cur.cloud_cover ?? 0);
    const code = Number(cur.weather_code ?? 0);

    let condition = 'Cerah Berawan';

    // Guard: Tropical models often report code 51 (drizzle) even when precip is 0
    if (code >= 95) {
      condition = 'Hujan Petir';
    } else if (precip >= 1.0 || rain >= 0.5) {
      condition = 'Hujan';
    } else if (precip >= 0.25 || rain >= 0.15) {
      condition = 'Hujan Ringan';
    } else {
      // Precipitation is 0 or negligible: determine actual sky condition
      if (code >= 45 && code <= 48) {
        condition = 'Berkabut';
      } else if (clouds >= 80 || code === 3) {
        condition = 'Berawan';
      } else if (clouds >= 25 || code === 1 || code === 2 || code === 51) {
        condition = 'Cerah Berawan';
      } else {
        condition = 'Cerah';
      }
    }

    return {
      temp,
      condition,
      city: cityLabel,
      source: 'Open-Meteo',
      iconType: resolveIconType(condition),
      updatedAt: Date.now()
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Reads cached weather from sessionStorage for instant rendering
 */
export function getCachedWeather(): WeatherInfo | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherInfo;
    if (Date.now() - parsed.updatedAt < CACHE_TTL_MS) {
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Saves weather to sessionStorage
 */
function setCachedWeather(info: WeatherInfo) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resolves current user coordinates (GPS or default office location)
 */
export async function resolveUserCoordinates(): Promise<{ lat: number; lon: number; cityLabel: string }> {
  // If browser geolocation is available and permitted
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 2500,
          maximumAge: 10 * 60 * 1000 // 10 min cache
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Check if within Jakarta area
      if (lat >= -6.45 && lat <= -6.05 && lon >= 106.65 && lon <= 107.05) {
        return { lat, lon, cityLabel: 'Jakarta' };
      }

      // Check closest BMKG region
      let closest = BMKG_REGIONS[0];
      let minDist = Infinity;
      for (const r of BMKG_REGIONS) {
        const d = getDistanceKm(lat, lon, r.lat, r.lon);
        if (d < minDist) {
          minDist = d;
          closest = r;
        }
      }

      return {
        lat,
        lon,
        cityLabel: minDist <= 35 ? closest.cityLabel : 'Indonesia'
      };
    } catch {
      // Permission denied or timed out: fall back to default
    }
  }

  return DEFAULT_COORDINATES;
}

/**
 * Main weather fetch function
 */
export async function getRealtimeWeather(
  customCoords?: { lat: number; lon: number; cityLabel?: string } | null
): Promise<WeatherInfo> {
  // 1. Check cache first
  const cached = getCachedWeather();
  if (cached && !customCoords) {
    return cached;
  }

  // 2. Resolve target coordinates
  const coords = customCoords
    ? {
        lat: customCoords.lat,
        lon: customCoords.lon,
        cityLabel: customCoords.cityLabel || 'Jakarta'
      }
    : await resolveUserCoordinates();

  // 3. Find closest BMKG region
  let closestRegion = BMKG_REGIONS[0];
  let minDistance = Infinity;

  for (const region of BMKG_REGIONS) {
    const dist = getDistanceKm(coords.lat, coords.lon, region.lat, region.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestRegion = region;
    }
  }

  // If closest BMKG region is within 60 km, attempt BMKG API first
  if (minDistance <= 60) {
    const bmkgData = await fetchBMKGWeather(closestRegion);
    if (bmkgData) {
      setCachedWeather(bmkgData);
      return bmkgData;
    }
  }

  // Fallback to Guarded Open-Meteo
  const openMeteoData = await fetchOpenMeteoWeather(coords.lat, coords.lon, coords.cityLabel);
  if (openMeteoData) {
    setCachedWeather(openMeteoData);
    return openMeteoData;
  }

  // Last-resort fallback
  const fallback: WeatherInfo = {
    temp: 31,
    condition: 'Cerah Berawan',
    city: coords.cityLabel || 'Jakarta',
    source: 'Fallback',
    iconType: 'cloud-sun',
    updatedAt: Date.now()
  };
  return fallback;
}

