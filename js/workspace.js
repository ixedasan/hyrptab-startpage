/**
 * workspace.js — Workspace / virtual desktop management
 * Shortcut: Ctrl+Shift+1/2/3 — works from any focus state
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

    // Ctrl+Shift+1/2/3 — works from any focus state, never conflicts with
    // browser shortcuts or leaks characters into inputs
    document.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === '1' || e.key === '!') { e.preventDefault(); switchTo(1); }
      if (e.key === '2' || e.key === '@') { e.preventDefault(); switchTo(2); }
      if (e.key === '3' || e.key === '#') { e.preventDefault(); switchTo(3); }
    }, true); // capture phase — fires before input handlers

    // Restore last workspace
    chrome.storage.local.get(['lastWorkspace'], ({ lastWorkspace }) => {
      if (lastWorkspace && lastWorkspace !== 1) {
        switchTo(lastWorkspace);
      }
    });
  }

  return { init, switchTo };
})();
