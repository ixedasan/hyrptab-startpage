# HyprTab — Hyprland-inspired Chrome New Tab

A functional, minimalist dashboard for Chrome inspired by Hyprland tiling WM and Unixporn aesthetics.

## Features

- 🎨 **Wallpaper-Sync** — Upload any image and the UI palette auto-adapts using k-means color extraction
- 🖥 **3 Workspaces** — Work / Focus / Dev — switch with `Ctrl+Shift+1/2/3` or the bar buttons
- ⬡ **Tiling Layout** — Non-overlapping geometric tile grid with consistent gaps and borders
- 📌 **Pinned Links** — User-managed links in named collapsible groups, with drag-to-reorder, inline edit, and move-between-groups
- 📂 **Chrome Bookmarks** — Live Bookmarks Bar display including folders, hidden scrollbar
- 🕐 **Live Clock** — HH:MM with animated seconds progress bar
- 🌤 **Weather** — Real-time temperature via Open-Meteo (geolocation, no API key needed)
- 🔍 **Smart Search** — Google / DuckDuckGo / Brave with URL auto-detection; type anything to start searching
- 🍅 **Pomodoro Timer** — 25/5/15 min modes, animated SVG ring, session tracker
- 🌍 **World Clocks** — Configurable per-timezone clocks with day-offset badges
- ⇆ **Unit Converter** — °C↔°F, km↔mi, px↔rem, kg↔lb, MB↔MiB
- 📝 **Scratch Pad** — Persistent notes (Workspace 3)

## Install

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `hyprtab/` folder (after unzipping)
5. Open a new tab

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + 1` | Switch to Workspace 1 |
| `Ctrl + Shift + 2` | Switch to Workspace 2 |
| `Ctrl + Shift + 3` | Switch to Workspace 3 |
| Type anything | Focus search bar |
| `Enter` | Search / navigate to URL |
| `Escape` | Clear search and unfocus |

Workspace shortcuts work from any focus state — including while the search bar is active — and never type characters into any input.

## Workspaces

| # | Purpose | Tiles |
|---|---------|-------|
| 1 | Work | Clock · Search · Bookmarks Bar · Pinned Links · Quote |
| 2 | Focus / Tools | Pomodoro · Clock · World Clocks + Converter · Theme |
| 3 | Dev | Dev Links · Clock · Scratch Pad · Tool Links |

## Pinned Links (Frequent tile)

- Links are organized into **named groups**, shown as open collapsible accordions
- Click a group header to collapse/expand it
- Click **+** in any group header to add a link directly to that group
- Click **edit** (top-right of tile) to enter edit mode:
  - Rename a group by clicking its label
  - ✕ removes a link · ✎ edits URL/name · ⇄ moves to another group
  - Drag cells to reorder within a group
  - **+ new group** button appears at the bottom
- All data persists locally via `chrome.storage`

## Permissions Used

- `bookmarks` — display your Chrome bookmarks bar
- `storage` — persist wallpaper, theme, pinned links, scratch pad, world clocks, and settings locally

No data leaves your device. Weather uses browser geolocation → Open-Meteo (open source, privacy-first).

## Customization

- Add custom links in `newtab.html` Workspace 3 tiles
- Edit `js/quote.js` to add your own quotes
- Edit `js/worldclock.js` → `DEFAULT_CLOCKS` to change default cities
- Tweak CSS variables at the top of `css/style.css` for layout or color adjustments
