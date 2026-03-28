/**
 * workspace.js — Workspace / virtual desktop management
 * Shortcut: Ctrl+1 / Ctrl+2 / Ctrl+3
 * (works from any focus state; not claimed by Chrome within page content)
 */

const Workspace = (() => {

  let current = 1;

  function switchTo(n) {
    const num = parseInt(n);
    if (isNaN(num) || num < 1 || num > 3) return;
    if (num === current) return;

    const prev = document.getElementById(`ws-${current}`);
    if (prev) prev.classList.remove('active');

    const next = document.getElementById(`ws-${num}`);
    if (next) next.classList.add('active');

    document.querySelectorAll('.ws-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.ws) === num);
    });

    current = num;
    chrome.storage.local.set({ lastWorkspace: num });
  }

  function init() {
    // Bind bar buttons
    document.querySelectorAll('.ws-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTo(btn.dataset.ws));
    });

    // Ctrl+1/2/3 — capture phase, fires before any input handler
    // Ctrl is safe: Chrome only uses Ctrl+1–8 for tab switching when the
    // tab bar is focused, not when a web page has focus.
    document.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (e.key === '1') { e.preventDefault(); switchTo(1); }
      if (e.key === '2') { e.preventDefault(); switchTo(2); }
      if (e.key === '3') { e.preventDefault(); switchTo(3); }
    }, true); // capture phase

    // Restore last workspace
    chrome.storage.local.get(['lastWorkspace'], ({ lastWorkspace }) => {
      if (lastWorkspace && lastWorkspace !== 1) {
        switchTo(lastWorkspace);
      }
    });
  }

  return { init, switchTo };
})();
