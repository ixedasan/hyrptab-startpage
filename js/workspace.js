/**
 * workspace.js — Workspace / virtual desktop management
 */

const Workspace = (() => {

  let current = 1;

  function switchTo(n) {
    const num = parseInt(n);
    if (isNaN(num) || num < 1 || num > 3) return;
    if (num === current) return;

    // Hide active workspace
    const prev = document.getElementById(`ws-${current}`);
    if (prev) prev.classList.remove('active');

    // Show new workspace
    const next = document.getElementById(`ws-${num}`);
    if (next) next.classList.add('active');

    // Update bar indicators
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

    // Keyboard shortcuts: 1/2/3 when not in input
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '1') switchTo(1);
      if (e.key === '2') switchTo(2);
      if (e.key === '3') switchTo(3);
    });

    // Restore last workspace
    chrome.storage.local.get(['lastWorkspace'], ({ lastWorkspace }) => {
      if (lastWorkspace && lastWorkspace !== 1) {
        switchTo(lastWorkspace);
      }
    });
  }

  return { init, switchTo };
})();
