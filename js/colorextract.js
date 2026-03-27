/**
 * colorextract.js
 * Dominant color extraction from wallpaper images.
 * Updates CSS variables to match the wallpaper palette.
 */

const ColorExtract = (() => {

  // ── Utility: convert RGB to HSL ──
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ── K-means quantization (simplified) ──
  function quantize(pixels, k = 8) {
    const step = Math.max(1, Math.floor(pixels.length / 4 / 800));
    const samples = [];
    for (let i = 0; i < pixels.length; i += step * 4) {
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
      if (a < 128) continue;
      // skip near-black and near-white
      const [, , l] = rgbToHsl(r, g, b);
      if (l < 8 || l > 95) continue;
      samples.push([r, g, b]);
    }

    if (samples.length === 0) return null;

    // Init centroids
    let centroids = [];
    for (let i = 0; i < k; i++) {
      centroids.push(samples[Math.floor(Math.random() * samples.length)].slice());
    }

    for (let iter = 0; iter < 12; iter++) {
      const clusters = Array.from({ length: k }, () => []);
      for (const px of samples) {
        let best = 0, bestDist = Infinity;
        for (let c = 0; c < k; c++) {
          const dr = px[0]-centroids[c][0], dg = px[1]-centroids[c][1], db = px[2]-centroids[c][2];
          const d = dr*dr + dg*dg + db*db;
          if (d < bestDist) { bestDist = d; best = c; }
        }
        clusters[best].push(px);
      }
      for (let c = 0; c < k; c++) {
        if (clusters[c].length === 0) continue;
        const mean = [0, 0, 0];
        for (const px of clusters[c]) { mean[0] += px[0]; mean[1] += px[1]; mean[2] += px[2]; }
        centroids[c] = mean.map(v => Math.round(v / clusters[c].length));
      }
    }

    return centroids;
  }

  // ── Pick best accent from palette ──
  function pickAccents(palette) {
    if (!palette || palette.length === 0) return null;

    // Score by saturation and reasonable lightness
    const scored = palette.map(([r, g, b]) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      const score = s * (1 - Math.abs(l - 55) / 55);
      return { r, g, b, h, s, l, score, hex: rgbToHex(r, g, b) };
    }).sort((a, b) => b.score - a.score);

    const primary = scored[0];

    // Pick a complementary accent (hue offset ~120°)
    const comp = scored.find(c => {
      const hDiff = Math.abs(c.h - primary.h);
      return hDiff > 60 && hDiff < 300;
    }) || scored[1] || primary;

    // Pick a third distinct accent
    const third = scored.find(c => {
      const hDiff1 = Math.abs(c.h - primary.h);
      const hDiff2 = Math.abs(c.h - comp.h);
      return hDiff1 > 40 && hDiff2 > 40;
    }) || scored[2] || primary;

    return { primary, comp, third, all: scored };
  }

  // ── Generate dark bg from primary hue ──
  function generateTheme(primary) {
    const { h } = primary;
    const bg = rgbToHex(...hslToRgb(h, 12, 8));
    const bg2 = rgbToHex(...hslToRgb(h, 12, 11));
    const border = rgbToHex(...hslToRgb(h, 15, 20));
    const textMain = rgbToHex(...hslToRgb(h, 20, 88));
    const textDim = rgbToHex(...hslToRgb(h, 10, 52));
    const textDimmer = rgbToHex(...hslToRgb(h, 8, 32));
    return { bg, bg2, border, textMain, textDim, textDimmer };
  }

  // ── Apply to CSS variables ──
  function applyTheme(accents) {
    const { primary, comp, third, all } = accents;
    const theme = generateTheme(primary);

    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg2', theme.bg2);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--accent', primary.hex);
    root.style.setProperty('--accent2', comp.hex);
    root.style.setProperty('--accent3', third.hex);
    root.style.setProperty('--text', theme.textMain);
    root.style.setProperty('--text-dim', theme.textDim);
    root.style.setProperty('--text-dimmer', theme.textDimmer);

    // Update palette preview swatches
    const preview = document.getElementById('palette-preview');
    if (preview && all) {
      preview.innerHTML = '';
      all.slice(0, 8).forEach((color, i) => {
        const sw = document.createElement('div');
        sw.className = 'palette-swatch' + (i === 0 ? ' active-swatch' : '');
        sw.style.background = color.hex;
        sw.title = color.hex;
        sw.addEventListener('click', () => {
          // Allow user to pin a specific color as accent
          root.style.setProperty('--accent', color.hex);
          preview.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active-swatch'));
          sw.classList.add('active-swatch');
          chrome.storage.local.set({ pinnedAccent: color.hex });
        });
        preview.appendChild(sw);
      });
    }

    // Save to storage
    chrome.storage.local.set({
      theme: {
        bg: theme.bg, bg2: theme.bg2, border: theme.border,
        accent: primary.hex, accent2: comp.hex, accent3: third.hex,
        text: theme.textMain, textDim: theme.textDim, textDimmer: theme.textDimmer
      }
    });
  }

  // ── Extract from image element ──
  function extractFromImage(imgEl) {
    const canvas = document.getElementById('color-canvas');
    const ctx = canvas.getContext('2d');
    const size = 80;
    canvas.width = size;
    canvas.height = size;

    try {
      ctx.drawImage(imgEl, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const palette = quantize(data, 8);
      if (!palette) return;
      const accents = pickAccents(palette);
      if (!accents) return;
      applyTheme(accents);
    } catch (e) {
      console.warn('HyprTab: Color extraction failed', e);
    }
  }

  // ── Public: process a dataURL wallpaper ──
  function processWallpaper(dataUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => extractFromImage(img);
    img.onerror = () => console.warn('HyprTab: Could not load wallpaper for color extraction');
    img.src = dataUrl;
  }

  // ── Public: restore saved theme ──
  function restoreSavedTheme() {
    chrome.storage.local.get(['theme', 'pinnedAccent'], ({ theme, pinnedAccent }) => {
      if (!theme) return;
      const root = document.documentElement;
      root.style.setProperty('--bg', theme.bg);
      root.style.setProperty('--bg2', theme.bg2);
      root.style.setProperty('--border', theme.border);
      root.style.setProperty('--accent', pinnedAccent || theme.accent);
      root.style.setProperty('--accent2', theme.accent2);
      root.style.setProperty('--accent3', theme.accent3);
      root.style.setProperty('--text', theme.text);
      root.style.setProperty('--text-dim', theme.textDim);
      root.style.setProperty('--text-dimmer', theme.textDimmer);
    });
  }

  return { processWallpaper, restoreSavedTheme, extractFromImage };
})();
