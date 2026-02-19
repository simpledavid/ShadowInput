# ShadowInput – YouTube Learning Mode

A Chrome/Edge extension (Manifest V3) that turns any YouTube video into an interactive English learning session.

## Features

| Mode | Description |
|------|-------------|
| **Word Hover** | Hover over any caption word → video pauses + word card. Leave → video resumes. Add words to your flashcard deck. |
| **Sentence Loop** | Loops each sentence N times for listen-and-repeat practice. Navigate prev/next sentence. Works with full caption tracks or live captions. |
| **Transcript** | Side panel showing full transcript (or accumulated captions). Highlights the current sentence. Click any line to seek to that position. |

## Installation (Development)

### Prerequisites

- Chrome 114+ or Edge 114+
- Node.js 16+ (only needed to regenerate icons)

### Steps

1. **Clone / download** this repository to your machine.

2. **Generate icons** (already done if you cloned the repo):
   ```bash
   node scripts/generate_icons.js
   ```

3. **Load the extension in Chrome/Edge:**
   - Open `chrome://extensions` (or `edge://extensions`)
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `ShadowInput/` directory (the one containing `manifest.json`)

4. **Test it:**
   - Open any YouTube video that has captions (e.g. TED talks, news clips)
   - Enable YouTube's CC captions first (click the CC button in the player)
   - Click the **Learning Mode** button that appears in the top-right of the player
   - Switch between Word Hover / Sentence Loop / Transcript modes using the control bar

## Usage Guide

### Word Hover Mode (Default)

1. Enable YouTube CC captions on the video
2. Enter Learning Mode – a caption overlay appears above the original captions
3. Hover your mouse over any word
4. After the dwell threshold (default 80ms), the video pauses and a popover appears
5. Click **+ Flashcard** to save the word
6. Move your mouse away → video resumes after 150ms delay
7. Moving quickly over words won't trigger pauses (anti-jitter)

### Sentence Loop Mode

1. Switch to **Sentence Loop** in the control bar
2. The current sentence loops N times (default: 2×) automatically
3. Use **⏮ Prev** / **Next ⏭** to navigate manually
4. **↺ Replay** restarts the current sentence
5. Configure loop count and auto-pause behavior directly in the panel

### Transcript Mode

1. Switch to **Transcript** in the control bar
2. A side panel slides in with the full transcript
   - If the video has a downloadable caption track: shows all cues upfront
   - Otherwise: accumulates captions as they appear during playback
3. The current sentence is highlighted in indigo
4. Click any sentence to jump to that position in the video

### Flashcard Management

- Click the extension icon (toolbar) to open the popup
- See your saved flashcard count
- Export as **JSON** or **CSV**
- Delete individual cards or **Clear All**

### Settings

Open the popup → **⚙ Settings**, or right-click the extension icon → Options:

| Setting | Default | Description |
|---------|---------|-------------|
| Dwell time | 80ms | How long cursor must stay on a word before pausing |
| Resume delay | 150ms | How long to wait after leaving a word before resuming |
| Loop count | 2 | Sentence repeat count in Loop mode |
| Pause after sentence | On | Stop after all loops; require manual Next |
| Default mode | Word Hover | Mode activated when entering Learning Mode |
| Show overlay | On | Whether to show plugin caption overlay |

## Architecture

```
ShadowInput/
├── manifest.json              – MV3 manifest
├── background.js              – Service worker (storage relay)
├── content/
│   ├── content.js             – Main orchestrator, SPA navigation handler
│   ├── caption-provider.js    – MutationObserver + full timedtext fetch
│   ├── player-controller.js   – YouTube player API abstraction
│   ├── word-hover.js          – Word Hover mode + popover state machine
│   ├── sentence-loop.js       – Sentence Loop mode
│   ├── transcript.js          – Transcript panel
│   ├── ui-injector.js         – Toggle button + control bar injection
│   └── flashcard-store.js     – chrome.storage.local wrapper
├── styles/
│   └── learning-ui.css        – All extension UI styles
├── popup/
│   ├── popup.html / popup.js  – Extension popup
├── options/
│   ├── options.html / options.js – Settings page
├── icons/
│   └── icon{16,32,48,128}.png
└── scripts/
    └── generate_icons.js      – Node.js icon generator (no deps)
```

### Caption Acquisition Strategy

The extension uses a two-channel approach:

1. **Full caption track** (preferred): On page load, reads `ytInitialPlayerResponse` via an inline page-context script to discover the caption track URL, then fetches the JSON3 timedtext. This gives precise `startMs`/`endMs` for every cue — enabling accurate Sentence Loop and Transcript navigation.

2. **Live captions** (fallback): A `MutationObserver` watches `.ytp-caption-segment` elements in the YouTube caption DOM. Every unique text change is captured with the current playback time. This works without a downloadable track but timing is approximate.

### Word Hover State Machine

```
IDLE  ──(mouseenter + dwell > 80ms)──▶  PAUSED
  ▲                                         │
  │  (mouseleave + no popover)              │ (mouseleave word)
  │                                         ▼
  └───────────────────────────────  scheduleResume(150ms)
                                            │
                             (mouseenter popover) ──▶ cancelResume
```

## Known Limitations & Workarounds

| Issue | Status / Workaround |
|-------|-------------------|
| No captions → learning mode unavailable | Shown as warning banner. Enable YouTube CC first. |
| YouTube DOM changes may break caption selectors | Selectors are in `caption-provider.js` — update `CAPTION_SEGMENT_SELECTOR` |
| Full caption track unavailable for some videos | Falls back to live caption accumulation automatically |
| Autogenerated captions have lower accuracy | Not a plugin limitation; caption quality depends on YouTube |
| Seek in transcript may be approximate in live mode | `approxStartMs` is the time the line was first seen |
| Full-screen mode may shift overlay position | Overlay is repositioned via CSS `:fullscreen` rules |
| YouTube SPA navigation | Handled via `yt-navigate-finish` event + URL polling fallback |

## Development Tips

```bash
# Regenerate icons after editing generate_icons.js
node scripts/generate_icons.js

# After editing any content script or CSS, go to chrome://extensions
# and click the ↻ refresh button for ShadowInput, then reload the YouTube tab.
```

To inspect the extension's state from the browser console on a YouTube page:
```js
// Access internal state (debug only)
window.__shadowInput
window.__shadowInput.PC.getCurrentTimeMs()
window.__shadowInput.CP.getFullCues()
```

## Acceptance Criteria (MVP)

- [x] Toggle Learning Mode button appears on any YouTube watch page
- [x] Word Hover: hover pauses video, leave resumes; anti-jitter dwell timer
- [x] Word Hover: popover with word + sentence + Add to Flashcard button
- [x] Flashcards persisted in `chrome.storage.local`, exportable as JSON/CSV
- [x] Sentence Loop: loops current sentence N times, prev/next navigation
- [x] Transcript: accumulated caption list with current sentence highlighted
- [x] Transcript: click sentence to seek to that position
- [x] Full caption track fetch with fallback to live mode
- [x] SPA navigation handled (works across video switches)
- [x] Settings: dwell, resume delay, loop count, default mode

## License

MIT
