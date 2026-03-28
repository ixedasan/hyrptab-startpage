/**
 * background.js — Service worker proxy for autocomplete suggestions.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'FETCH_SUGGESTIONS') return false;

  const { query, engine } = message;

  if (!query || !query.trim()) {
    sendResponse([]);
    return true;
  }

  // Build URL — use output=toolbar for Google (plain JSON, widely supported)
  let url;
  if (engine === 'ddg') {
    url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
  } else {
    url = `https://suggestqueries.google.com/complete/search?output=toolbar&hl=en&q=${encodeURIComponent(query)}`;
  }

  // Must return true synchronously to keep the message channel open,
  // then call sendResponse inside the async chain.
  (async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();

      let suggestions = [];

      if (engine === 'ddg') {
        // DDG: ["query", ["s1","s2",...]]
        const data = JSON.parse(text);
        suggestions = Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
      } else {
        // Google toolbar XML: <CompleteSuggestion><suggestion data="..."/></CompleteSuggestion>
        const matches = [...text.matchAll(/data="([^"]+)"/g)];
        suggestions = matches.map(m => {
          // XML-decode basic entities
          return m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
        }).slice(0, 8);
      }

      sendResponse(suggestions);
    } catch (err) {
      sendResponse([]);
    }
  })();

  return true; // keep channel open for async sendResponse
});
