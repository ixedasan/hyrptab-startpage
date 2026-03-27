/**
 * weather.js — Fetches weather from Open-Meteo (free, no API key)
 * Uses browser geolocation → wttr.in fallback
 */

const Weather = (() => {

  const WMO_ICONS = {
    0: '☀', 1: '🌤', 2: '⛅', 3: '☁',
    45: '🌫', 48: '🌫',
    51: '🌦', 53: '🌦', 55: '🌧',
    61: '🌧', 63: '🌧', 65: '🌧',
    71: '❄', 73: '❄', 75: '❄',
    80: '🌦', 81: '🌧', 82: '🌧',
    95: '⛈', 96: '⛈', 99: '⛈',
  };

  function getIcon(code) {
    return WMO_ICONS[code] || '🌡';
  }

  async function fetchWeatherByCoords(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('open-meteo failed');
    const data = await res.json();
    const cw = data.current_weather;
    return {
      temp: Math.round(cw.temperature),
      icon: getIcon(cw.weathercode),
      unit: '°C'
    };
  }

  async function init() {
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    if (!iconEl || !tempEl) return;

    // Try cache first
    chrome.storage.local.get(['weatherCache'], async ({ weatherCache }) => {
      if (weatherCache && (Date.now() - weatherCache.ts) < 15 * 60 * 1000) {
        iconEl.textContent = weatherCache.icon;
        tempEl.textContent = `${weatherCache.temp}${weatherCache.unit}`;
        return;
      }

      // Geolocation
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const w = await fetchWeatherByCoords(coords.latitude, coords.longitude);
            iconEl.textContent = w.icon;
            tempEl.textContent = `${w.temp}${w.unit}`;
            chrome.storage.local.set({ weatherCache: { ...w, ts: Date.now() } });
          } catch (e) {
            console.warn('HyprTab: Weather fetch failed', e);
            iconEl.textContent = '?';
            tempEl.textContent = '--°';
          }
        },
        (err) => {
          console.warn('HyprTab: Geolocation denied', err);
          iconEl.textContent = '📍';
          tempEl.textContent = 'n/a';
        },
        { timeout: 5000 }
      );
    });
  }

  return { init };
})();
