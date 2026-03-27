# HyprTab — Hyprland-inspired Chrome New Tab

A functional, minimalist dashboard for Chrome inspired by Hyprland tiling WM and Unixporn aesthetics.

## Features

- 🎨 **Wallpaper-Sync** — Upload any image and the UI palette auto-adapts using k-means color extraction
- 🖥 **3 Workspaces** — Work / Entertainment / Dev — switch with `1` `2` `3` keys or bar buttons
- ⬡ **Tiling Layout** — Non-overlapping geometric tile grid with consistent gaps and borders
- 📌 **Chrome Bookmarks** — Live display of your actual Chrome bookmarks
- 🔥 **Top Sites** — Your most visited pages, pulled from Chrome
- 🕐 **Live Clock** — HH:MM with animated seconds progress bar across all workspaces
- 🌤 **Weather** — Real-time temperature via Open-Meteo (geolocation, no API key needed)
- 🔍 **Smart Search** — Google / DuckDuckGo / Brave with URL auto-detection
- 📝 **Scratch Pad** — Persistent notes stored locally
- ⌨ **Keyboard-first** — `1-3` workspaces, `Enter` to search, type anywhere to start searching

## Install

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `hyprtab/` folder
5. Open a new tab → enjoy

## Usage

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Switch workspace |
| Type anything | Focus search bar |
| `Enter` | Search / navigate |
| `Escape` | Clear search |

**Workspace 2 → Theme tile**: Upload a wallpaper image to sync the color palette. Click any swatch to pin an accent color. Hit "reset" to revert to defaults.

## Permissions Used

- `bookmarks` — display your Chrome bookmarks
- `topSites` — display frequently visited sites
- `storage` — persist wallpaper, theme, scratch pad, and settings locally

No data leaves your device. Weather uses browser geolocation → Open-Meteo (open source, privacy-first).

## Customization

Edit `js/bookmarks.js` to filter bookmark folders.  
Edit `js/quote.js` to add your own quotes.  
Add custom links directly in `newtab.html` workspace tiles.  
Tweak `css/style.css` CSS variables for layout adjustments.
