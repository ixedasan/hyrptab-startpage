/**
 * search.js — Search bar logic with engine toggle
 */

const Search = (() => {

  let activeEngine = 'https://www.google.com/search?q=';

  function init() {
    const input = document.getElementById('search-input');
    if (!input) return;

    // Engine toggle buttons
    document.querySelectorAll('.engine-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEngine = btn.dataset.engine;
        document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chrome.storage.local.set({ searchEngine: activeEngine });
        input.focus();
      });
    });

    // Restore saved engine
    chrome.storage.local.get(['searchEngine'], ({ searchEngine }) => {
      if (searchEngine) {
        activeEngine = searchEngine;
        document.querySelectorAll('.engine-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.engine === searchEngine);
        });
      }
    });

    // Auto-focus search on load (if not in another workspace)
    setTimeout(() => input.focus(), 120);

    // Search on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const query = input.value.trim();
        // If it looks like a URL, navigate directly
        if (/^https?:\/\//i.test(query) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(query)) {
          const url = /^https?:\/\//i.test(query) ? query : `https://${query}`;
          window.location.href = url;
        } else {
          window.location.href = activeEngine + encodeURIComponent(query);
        }
      }
      if (e.key === 'Escape') {
        input.value = '';
        input.blur();
      }
    });

    // Global key capture: start typing to focus search
    // Guard: ignore all modifier combos (Ctrl+Shift+1/2/3 are workspace shortcuts)
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        input.focus();
      }
    });
  }

  return { init };
})();
