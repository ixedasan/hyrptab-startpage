/**
 * search.js — Search bar with recent history + live autocomplete.
 *
 * Suggestions come from the background service worker (bypasses CSP/CORS).
 * Recent searches are stored locally in chrome.storage and shown at the top
 * of the dropdown, just like Google's search bar.
 */

const Search = (() => {

  const HISTORY_KEY = 'searchHistory';
  const MAX_HISTORY = 8;

  let activeEngine  = 'https://www.google.com/search?q=';
  let suggestions   = []; // combined list for keyboard nav: [{text, type}]
  let selectedIdx   = -1;
  let debounceTimer = null;
  let currentQuery  = '';

  // ─────────────────────────────────────────────
  // History
  // ─────────────────────────────────────────────

  function loadHistory(cb) {
    chrome.storage.local.get([HISTORY_KEY], r => cb(r[HISTORY_KEY] || []));
  }

  function saveToHistory(query) {
    const q = query.trim();
    if (!q || q.length < 2) return;
    loadHistory(hist => {
      const filtered = hist.filter(h => h.toLowerCase() !== q.toLowerCase());
      filtered.unshift(q);
      chrome.storage.local.set({ [HISTORY_KEY]: filtered.slice(0, MAX_HISTORY) });
    });
  }

  function clearHistory(cb) {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, cb);
  }

  // ─────────────────────────────────────────────
  // Suggest via service worker
  // ─────────────────────────────────────────────

  function fetchSuggestions(query, cb) {
    const engine = activeEngine.includes('duckduckgo') ? 'ddg' : 'google';

    function attempt(left) {
      chrome.runtime.sendMessage({ type: 'FETCH_SUGGESTIONS', query, engine }, results => {
        if (chrome.runtime.lastError) {
          if (left > 0) setTimeout(() => attempt(left - 1), 300);
          else cb([]);
          return;
        }
        cb(Array.isArray(results) ? results : []);
      });
    }
    attempt(1);
  }

  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────

  function navigate(query) {
    const q = query.trim();
    if (!q) return;
    saveToHistory(q);
    if (/^https?:\/\//i.test(q) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(q)) {
      window.location.href = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    } else {
      window.location.href = activeEngine + encodeURIComponent(q);
    }
  }

  // ─────────────────────────────────────────────
  // Dropdown rendering
  // ─────────────────────────────────────────────

  function esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(text) {
    const typed = currentQuery.toLowerCase();
    const lower  = text.toLowerCase();
    if (lower.startsWith(typed) && typed.length < text.length) {
      return `<span class="suggest-typed">${esc(text.slice(0, typed.length))}</span>${esc(text.slice(typed.length))}`;
    }
    return esc(text);
  }

  function makeItem(text, type, input, dropdown) {
    const item = document.createElement('div');
    item.className = 'suggest-item';
    item.dataset.text = text;

    const icon = document.createElement('span');
    icon.className = 'suggest-icon' + (type === 'history' ? ' suggest-icon--history' : '');
    icon.textContent = type === 'history' ? '⟳' : '↗';

    const label = document.createElement('span');
    label.className = 'suggest-text';
    label.innerHTML = highlight(text);

    item.appendChild(icon);
    item.appendChild(label);

    // History items get a remove button on the right
    if (type === 'history') {
      const removeBtn = document.createElement('span');
      removeBtn.className = 'suggest-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        loadHistory(hist => {
          const updated = hist.filter(h => h !== text);
          chrome.storage.local.set({ [HISTORY_KEY]: updated }, () => {
            showDropdown(input, dropdown);
          });
        });
      });
      item.appendChild(removeBtn);
    }

    item.addEventListener('mousedown', e => {
      e.preventDefault();
      input.value = text;
      closeDropdown(dropdown);
      navigate(text);
    });
    item.addEventListener('mouseenter', () => {
      selectedIdx = suggestions.findIndex(s => s.text === text);
      updateSelected(dropdown);
    });

    return item;
  }

  function renderDropdown(input, dropdown, histItems, suggestItems) {
    dropdown.innerHTML = '';
    suggestions = [];

    const hasHistory  = histItems.length > 0;
    const hasSuggest  = suggestItems.length > 0;

    if (!hasHistory && !hasSuggest) {
      dropdown.classList.remove('open');
      return;
    }

    // ── Recent searches ──
    if (hasHistory) {
      const label = document.createElement('div');
      label.className = 'suggest-section-label';
      label.textContent = 'recent';
      dropdown.appendChild(label);

      histItems.forEach(text => {
        suggestions.push({ text, type: 'history' });
        dropdown.appendChild(makeItem(text, 'history', input, dropdown));
      });

      // Clear all history link
      const clearRow = document.createElement('div');
      clearRow.className = 'suggest-clear-item';
      clearRow.innerHTML = `<span>✕</span><span>clear history</span>`;
      clearRow.addEventListener('mousedown', e => {
        e.preventDefault();
        clearHistory(() => showDropdown(input, dropdown));
      });
      dropdown.appendChild(clearRow);
    }

    // ── Divider ──
    if (hasHistory && hasSuggest) {
      const div = document.createElement('div');
      div.className = 'suggest-divider';
      dropdown.appendChild(div);
    }

    // ── Live suggestions ──
    if (hasSuggest) {
      if (hasHistory) {
        const label = document.createElement('div');
        label.className = 'suggest-section-label';
        label.textContent = 'suggestions';
        dropdown.appendChild(label);
      }
      suggestItems.forEach(text => {
        suggestions.push({ text, type: 'suggest' });
        dropdown.appendChild(makeItem(text, 'suggest', input, dropdown));
      });
    }

    selectedIdx = -1;
    dropdown.classList.add('open');
  }

  function showDropdown(input, dropdown) {
    const q = input.value.trim();

    loadHistory(hist => {
      // Filter history to match current query (or show all if empty)
      const filteredHist = q
        ? hist.filter(h => h.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
        : hist.slice(0, 5);

      if (!q) {
        // No query — show only history
        renderDropdown(input, dropdown, filteredHist, []);
      } else {
        // Fetch suggestions in parallel
        fetchSuggestions(q, suggestItems => {
          // Deduplicate: remove suggestions already in history
          const histSet = new Set(filteredHist.map(h => h.toLowerCase()));
          const deduped = suggestItems.filter(s => !histSet.has(s.toLowerCase())).slice(0, 6);
          renderDropdown(input, dropdown, filteredHist, deduped);
        });
      }
    });
  }

  function closeDropdown(dropdown) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    suggestions = [];
    selectedIdx = -1;
  }

  function updateSelected(dropdown) {
    dropdown.querySelectorAll('.suggest-item').forEach((el, i) =>
      el.classList.toggle('selected', i === selectedIdx));
  }

  // ─────────────────────────────────────────────
  // Debounce
  // ─────────────────────────────────────────────

  function scheduleFetch(query, input, dropdown) {
    clearTimeout(debounceTimer);
    currentQuery = query;
    debounceTimer = setTimeout(() => {
      if (query !== input.value) return;
      showDropdown(input, dropdown);
    }, 180);
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  function init() {
    const input    = document.getElementById('search-input');
    const dropdown = document.getElementById('suggest-dropdown');
    if (!input || !dropdown) return;

    // Engine toggle
    document.querySelectorAll('.engine-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEngine = btn.dataset.engine;
        document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chrome.storage.local.set({ searchEngine: activeEngine });
        closeDropdown(dropdown);
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

    // No autofocus on load — user can start typing to focus naturally

    // Typing — update dropdown
    input.addEventListener('input', () => {
      currentQuery = input.value;
      scheduleFetch(input.value, input, dropdown);
    });

    // Focus — show history immediately if empty, or fetch if has value
    input.addEventListener('focus', () => {
      currentQuery = input.value;
      showDropdown(input, dropdown);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => closeDropdown(dropdown), 160);
    });

    // Keyboard nav
    input.addEventListener('keydown', e => {
      const isOpen = dropdown.classList.contains('open');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) { showDropdown(input, dropdown); return; }
        if (!suggestions.length) return;
        selectedIdx = (selectedIdx + 1) % suggestions.length;
        updateSelected(dropdown);
        input.value = suggestions[selectedIdx].text;
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!suggestions.length) return;
        selectedIdx = selectedIdx <= 0 ? suggestions.length - 1 : selectedIdx - 1;
        updateSelected(dropdown);
        input.value = suggestions[selectedIdx].text;
        return;
      }

      if (e.key === 'Enter') {
        const sel = selectedIdx >= 0 ? suggestions[selectedIdx]?.text : null;
        navigate(sel || input.value);
        closeDropdown(dropdown);
        return;
      }

      if (e.key === 'Escape') {
        if (isOpen) { closeDropdown(dropdown); }
        else { input.value = ''; input.blur(); }
        return;
      }
    });

    // Global: type anything to focus search
    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) input.focus();
    });
  }

  return { init };
})();
