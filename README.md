# The Dews Feed — Situation Desk

The Dewplex preview of the office Raspberry Pi dashboard.

[Open the dashboard](https://copezetic.github.io/dewsfeed-demo/).

The shared desk design uses a locally stored WebP harbor illustration, a watch desk,
restrained transitions, and compositor-driven tickers. Select a topic or use All
Pages to jump to a screen. Previous/Next and Pause/Resume also work with the left/
right arrow keys and space bar when focus is outside a control.

Public feeds can populate without the office proxy; office-only feeds remain
unavailable here. No private configuration is included. Values are latest
available source readings, not guaranteed real-time prices. The harbor is an
AI-generated illustration, not a live camera or navigational image.

Add `?diagnostics` to display sampled browser FPS, longest frame interval in each
sample, and active bounded data requests. This measures the current device only.

The office and public editions share `desk.css`, `desk.js`, and `desk-harbor.webp`.
Keep these three files identical. Retain the edition-specific `index.html` and
never copy office credentials into this public repository. The Pi deployment
script includes all three assets. A real Pi performance check remains necessary.

## Full-screen broadcast mode

The feed now fills the viewport with an edge-to-edge animated overview, a compact
watch band, and two continuously scrolling ticker rails. Pages rotate every
15–18 seconds. Move the pointer, tap, or press a key to reveal controls; they hide
after inactivity. Use Fullscreen to enter browser fullscreen (requires a user
gesture), and Escape or Exit Fullscreen to leave it.

Pause freezes the ticker, image pan, and page-progress indicator. Resume continues
the remaining page time. New ticker readings switch at a loop boundary to avoid
jumps. Short ticker content repeats to fill the viewport. Reduced-motion system
preferences suppress motion. Hidden tabs suspend rotation and animations.
