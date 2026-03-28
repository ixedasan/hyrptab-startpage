/**
 * main.js — HyprTab entry point
 * Orchestrates all modules, handles wallpaper upload & persistence.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Suppress Chrome's "Customize Chrome" side panel button ──
  // This button is rendered by Chrome's browser process above the extension
  // document. The most reliable CSS approach is ensuring zero document scroll.
  // We also try to nuke any injected elements as a best-effort measure.
  function purgeNTPInjections() {
    const kill = [
      'ntp-app','#ntp-app','cr-button','ntp-realbox',
      '#realbox-container','#customization-menu',
      'ntp-middle-slot-promo','ntp-iframe','ntp-customize-dialog',
    ];
    kill.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
    // Ensure document never scrolls (scroll triggers Chrome's NTP chrome bar)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  purgeNTPInjections();
  const ntpObserver = new MutationObserver(purgeNTPInjections);
  ntpObserver.observe(document.documentElement, { childList: true, subtree: true });

  // ── Init all modules ──
  Clock.init();
  Weather.init();
  Bookmarks.init();
  Workspace.init();
  Search.init();
  Quote.init();
  Pomodoro.init();
  WorldClock.init();

  // ── Restore wallpaper & theme ──
  restoreWallpaper();
  ColorExtract.restoreSavedTheme();

  // ── Greeting ──
  updateGreeting();

  // ── Scratch pad persistence ──
  initScratchPad();

  // ── Wallpaper controls (Workspace 2) ──
  const wallpaperInput = document.getElementById('wallpaper-input');
  if (wallpaperInput) {
    wallpaperInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        applyWallpaper(dataUrl);
        ColorExtract.processWallpaper(dataUrl);
        // Save to storage (compress if large)
        chrome.storage.local.set({ wallpaper: dataUrl });
      };
      reader.readAsDataURL(file);
    });
  }

  const clearBtn = document.getElementById('clear-wallpaper-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const layer = document.getElementById('wallpaper-layer');
      if (layer) {
        layer.style.backgroundImage = '';
        layer.classList.remove('has-image');
      }
      chrome.storage.local.remove(['wallpaper', 'theme', 'pinnedAccent', 'weatherCache']);
      // Reset CSS vars to defaults
      const root = document.documentElement;
      const defaults = {
        '--bg': '#0f1117', '--bg2': '#161820', '--border': '#313244',
        '--accent': '#cba6f7', '--accent2': '#89b4fa', '--accent3': '#a6e3a1',
        '--text': '#cdd6f4', '--text-dim': '#6c7086', '--text-dimmer': '#45475a'
      };
      Object.entries(defaults).forEach(([k, v]) => root.style.setProperty(k, v));
      const preview = document.getElementById('palette-preview');
      if (preview) preview.innerHTML = '';
    });
  }
});

// ── Apply wallpaper to DOM ──
function applyWallpaper(dataUrl) {
  const layer = document.getElementById('wallpaper-layer');
  if (!layer) return;
  layer.style.backgroundImage = `url(${dataUrl})`;
  layer.classList.add('has-image');
}

// ── Restore wallpaper from storage ──
function restoreWallpaper() {
  chrome.storage.local.get(['wallpaper'], ({ wallpaper }) => {
    if (wallpaper) {
      applyWallpaper(wallpaper);
    }
  });
}

// ── Greeting ──
function updateGreeting() {
  const el = document.getElementById('bar-greeting');
  if (!el) return;
  const h = new Date().getHours();
  let msg;
  if (h < 5)  msg = 'up late?';
  else if (h < 12) msg = 'good morning';
  else if (h < 17) msg = 'good afternoon';
  else if (h < 21) msg = 'good evening';
  else msg = 'good night';
  el.textContent = msg;
}

// ── Scratch pad ──
function initScratchPad() {
  const pad = document.getElementById('scratch-pad');
  if (!pad) return;
  chrome.storage.local.get(['scratchPad'], ({ scratchPad }) => {
    if (scratchPad) pad.value = scratchPad;
  });
  pad.addEventListener('input', () => {
    chrome.storage.local.set({ scratchPad: pad.value });
  });
}
