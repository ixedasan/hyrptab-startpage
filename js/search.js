/**
 * search.js — Search bar with engine toggle.
 *
 * Note: Live autocomplete suggestions from Google/DDG cannot be implemented
 * in a MV3 Chrome extension NTP page. Both fetch() and JSONP <script> injection
 * are blocked by Chrome's hardcoded extension CSP. There is no workaround
 * without running your own backend proxy server.
 */

const Search = (() => {

  let activeEngine = 'https://www.google.com/search?q=';

  function navigate(query) {
    const q = query.trim();
    if (!q) return;
    if (/^https?:\/\//i.test(q) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(q)) {
      window.location.href = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    } else {
      window.location.href = activeEngine + encodeURIComponent(q);
    }
  }

  function init() {
    const input = document.getElementById('search-input');
    if (!input) return;

    // Engine toggle
    document.querySelectorAll('.engine-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEngine = btn.dataset.engine;
        document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chrome.storage.local.set({ searchEngine: activeEngine });
        input.focus();
      });
    });

    chrome.storage.local.get(['searchEngine'], ({ searchEngine }) => {
      if (searchEngine) {
        activeEngine = searchEngine;
        document.querySelectorAll('.engine-btn').forEach(btn =>
          btn.classList.toggle('active', btn.dataset.engine === searchEngine));
      }
    });

    setTimeout(() => input.focus(), 120);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { navigate(input.value); return; }
      if (e.key === 'Escape') { input.value = ''; input.blur(); }
    });

    // Global: type anything to focus search
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) input.focus();
    });
  }

  return { init };
})();
