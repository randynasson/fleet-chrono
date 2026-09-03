# Handoff: Fleet Chrono — "Holo Tactical Violet" restyle

## Overview
Fleet Chrono is a mobile-web tournament timer for Star Wars: Armada. It tracks a game
clock, the round/phase sequence, and each player's per-activation turn time, then reports
pace analysis at the end. It supports a single-device mode and a two-device mode
(Supabase-backed).

This handoff is a **pure visual restyle**. The UX, screen flow, information architecture,
copy, and all game logic are unchanged from the existing prototype. Nothing here adds,
removes, or reorders a screen, a control, or a state.

The chosen direction is **Holo Tactical Violet**: a diegetic in-universe holographic
readout. Near-black void, luminous hairline rules instead of filled panels, corner
targeting brackets on the live element, bloom (`text-shadow`) on live numbers, and small
breathing status lamps. It reads as a hologram projected above the table rather than a
web app.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing
the intended look, not production code to copy verbatim. The design lives in a single
streaming component file (`Fleet Chrono Design.dc.html`) that is a *design document*: it
renders every screen side by side as a gallery of 420×760 device frames, and includes the
two earlier exploration rounds for context.

The task is to **apply this visual language to the existing prototype** (`armada-clock.html`,
also bundled) — or to recreate it in whatever environment the app is heading toward
(React, Vue, native). The existing prototype's HTML structure, ids, and JavaScript are all
still valid; in principle this restyle can be delivered by replacing the `<style>` block
and adding a few decorative child elements (corner brackets, status lamps), with **no
changes to the script**.

## Fidelity
**High-fidelity.** Final colors, typography, sizes, spacing, and states. Recreate
pixel-accurately. Every value below is exact and measured from the design file.

---

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| `--void` | `#06040b` | App background |
| `--frame-border` | `#2e1f42` | Device frame border |
| `--violet` | `#c08cf5` | System accent, Second Player, primary CTA fill |
| `--violet-bright` | `#e2ccfd` | Primary CTA border |
| `--violet-text` | `#d9befa` | Ghost-button label, phase name |
| `--violet-hi` | `#f1e6fc` / `#f3ebfd` | Large readout numerals, headings |
| `--violet-mid` | `#e2d3f5` | Second Player name in lists |
| `--violet-body` | `#a294b8` | Body copy |
| `--violet-muted` | `#8f81a6` | Secondary/meta copy |
| `--violet-idle` | `#9c8ab0` | Idle player name |
| `--violet-idle-num` | `#7d6a94` | Idle player numerals |
| `--violet-cta-ink` | `#170a24` | Ink on violet fill |
| `--amber` | `#e8a33d` | First Player, warning state |
| `--amber-hi` | `#ffd79a` | Live amber numerals |
| `--amber-label` | `#ffe6bf` | First Player name |
| `--amber-badge` | `#ffce7d` | `ACTIVE` badge text, warning banner text |
| `--amber-ghost-text` | `#f0c98a` | Pass button label |
| `--amber-ink` | `#2a1b04` | Ink on amber fill |
| `--red` | `#f08a94` | Overtime, "over" figures, SLOW tag, End Game |
| `--red-line` | `rgba(240,90,110,.45)` | Red borders |
| `--red-wash` | `rgba(240,90,110,.10)` | Slow-activation row background |
| `--green` | `#9ee0b0` | "ON TRACK" pace badge only |

Alpha derivatives of violet (used constantly — keep as `rgba`, not solid hex):
`rgba(192,140,245,.75)` micro-labels · `.55` unit sub-labels · `.5` idle labels ·
`.32` ghost borders · `.3` input + control borders · `.24` section hairlines ·
`.2` card borders · `.14` list dividers · `.1` / `.06` fills.

### Typography
Two families only.
- **Saira** (Google Fonts, 300/400/500/600) — all labels, names, copy, buttons.
- **Share Tech Mono** (Google Fonts, 400) — every number, code, and technical badge.
  Always with `font-variant-numeric: tabular-nums`.

Scale (px). **13px is the hard floor** — the app is read from about three feet away.
| Role | Size / weight / tracking |
|---|---|
| Screen wordmark ("FLEET CHRONO", landing) | 44 mono, `letter-spacing:.04em`, two lines |
| Screen wordmark (inner screens) | 26 mono, `.06em` |
| Screen heading (GAME COMPLETE / ALL ACTIVATIONS) | 26 / 24 mono, `.05em` |
| Shared phase clock (hero) | 82 mono |
| Active player clock | 68 mono |
| Game clock (strip) | 38 mono |
| Join-code input | 32 mono, `.22em` |
| Lobby game code | 44 mono, `.2em` |
| Round-complete title | 30 mono, `.06em` |
| Setup inputs | 22 mono, centered |
| Phase name (strip) | 21 Saira 400, `.05em` |
| Player name (active) | 20 Saira 500 |
| Player name (idle / lists) | 19 / 17 / 16 Saira 400 |
| Idle player numerals | 26 mono |
| List numerals | 17–21 mono |
| Buttons — primary | 16 Saira 600, `.10em`, uppercase |
| Buttons — player Pass/Done | 16 Saira 500/600, `.14em`, uppercase |
| Body copy | 15–17 Saira 400, `line-height:1.5–1.6` |
| Micro-labels (GAME CLOCK, ROUND 3 / 6, STANDING BY, section heads) | 13 Saira 400/500/600, `.20–.30em`, uppercase |
| Technical badges (ACTIVE, OVER PACE, SLOW, STEP 1 / 2) | 13 mono, `.12–.18em` |

Removed from the original: the "Activation in progress" status line — the amber wash,
brackets, blinking lamp, and `ACTIVE` badge already carry that meaning.

### Geometry
- Device frame: `420 × 760`, `border-radius: 28px`, `overflow: hidden`.
- **Everything inside the frame has square corners** (`border-radius: 0`). This is
  deliberate and central to the aesthetic — no rounded cards, no pill buttons. The only
  radii are the frame itself and 50% circles for status dots.
- Borders are `1px` (2px only for corner brackets and the amber emphasis border).
- Corner brackets: `26 × 26` (`22 × 22` on the lobby code card, `30 × 30` on the landing
  wordmark), `2px` solid, absolutely positioned at each corner of the parent.
- Screen padding: strips `22px 24px 18px`; stage `22px 20px`; control bar
  `18px 20px 24px`; setup-type screens `44px 30px 34px`.
- Gaps: stage panels `16px`; control bar `12px`; button rows `10–12px`.
- Touch targets: buttons are `17–19px` vertical padding (≈54px tall); icon buttons are
  `54px` square. Never smaller.

### Shadows / glow
- Frame: `0 30px 70px rgba(0,0,0,.7)`, plus `inset 0 0 80px rgba(192,140,245,.07)`.
- Ambient floor glow, one per screen, as a non-interactive absolutely-positioned overlay:
  `radial-gradient(90% 55% at 50% 105%, rgba(192,140,245,.18), transparent 70%)`
  (position varies per screen: bottom on live screens, top on landing/stats, center on the
  shared-phase screen).
- Live amber numerals: `text-shadow: 0 0 34px rgba(232,163,61,.65), 0 0 70px rgba(232,163,61,.3)`.
- Live violet numerals: `text-shadow: 0 0 22px rgba(192,140,245,.6)`; the 82px hero clock
  uses `0 0 40px rgba(192,140,245,.7), 0 0 80px rgba(192,140,245,.35)`.
- Status lamps: `box-shadow: 0 0 8–10px <own color>`.
- Violet CTA: `box-shadow: 0 0 28px rgba(192,140,245,.4)`; amber Done: `0 0 24px rgba(232,163,61,.5)`.
- Stats signal bars: `box-shadow: 0 0 16px rgba(<color>,.7)`.

### Motion
Three keyframes, all decorative and infinitely looping:
```css
@keyframes fc-blink   { 0%,100%{opacity:1} 50%{opacity:.25} }   /* 1.4s steps(1,end) — active lamp */
@keyframes fc-breathe { 0%,100%{opacity:.55} 50%{opacity:1} }   /* 2s ease-in-out — system lamp, warning banner (1.4s) */
@keyframes fc-sweep   { 0%{transform:translateX(-100%)} 100%{transform:translateX(220%)} }
@keyframes spin       { to { transform: rotate(360deg) } }       /* .8s linear — lobby spinner */
```
`fc-sweep` drives a 1px, 45%-wide amber gradient line across the top edge of the active
player panel (3.4s linear) — the scan pass that signals "this clock is running."

Button feedback is a state change on `:active` only (no transition): ghost buttons gain a
~12% wash of their own hue; glowing fills drop to a much smaller glow
(`0 0 28px` → `0 0 10px`). No transforms, no ripples.

---

## Screens / Views

All screens are 420 × 760 inside the device frame, `display:flex; flex-direction:column`,
on `--void` with one ambient glow overlay.

### 1. Landing (`#screen-landing`) — ref 3A
**Purpose:** choose tracking mode.
**Layout:** single column, `44px` gutters. Wordmark block at top with a `30×30` top-left
corner bracket and `18px` left inset; "FLEET CHRONO" 44px mono on two lines;
"TOURNAMENT CHRONOMETER" 13px `.20em` caps below; a
`linear-gradient(90deg, rgba(192,140,245,.5), transparent)` 1px rule under it. Flex spacer.
"How are you tracking this game?" (17px, `--violet-body`). Three full-width stacked
buttons, `12px` gap: **Use on this device** (violet fill), **Start a multi-device game**
and **Join a game** (ghost). Glow overlay at `50% 8%`.
**Resume variant:** the same screen swaps the three buttons for the resume summary copy
plus **Resume Game** (violet fill) / **Discard & Start New** (ghost) — unchanged behavior.

### 2. Setup — single device (`#screen-setup`) — ref 3B
26px mono wordmark, 15px body paragraph (exact original copy: "Tournament game timer for
Star Wars: Armada. Tracks the round clock, phases, and each player's turn time."), then
fields. Each field is a 13px `.24em` caps violet micro-label above a full-width input:
`background: rgba(192,140,245,.06)`, `1px solid rgba(192,140,245,.3)`, `16px` padding,
22px mono, centered, no radius, `outline:none` (use a brighter border on `:focus`).
Round limit is one input; the duration row is two flex-1 inputs with `12px` gap and
centered 13px `.20em` "hours" / "minutes" labels *below* them (the original had them
overlapping negatively — fixed). Spacer, then **Start game** (violet fill) and
**← Back** (dimmer ghost, `rgba(192,140,245,.22)` border).

### 3. Multi-device create (`#screen-multi-setup`) — ref 3C
Same field system. Step indicator is a row: 13px caps "MULTI-DEVICE", a flex-1 1px violet
hairline, then "STEP 1 / 2" in 13px mono violet. "You are" is a two-button segmented row:
selected = amber fill with `--amber-ink` and a `0 0 20px` amber glow; unselected = ghost.
**Create game** (violet fill) + **← Back**.

### 4. Lobby (`#screen-lobby`) — ref 3D
Step row reads "STEP 2 / 2". The hero is the **code card**: `34px 20px` padding,
`1px solid rgba(192,140,245,.3)`, `linear-gradient(180deg, rgba(192,140,245,.1), rgba(192,140,245,.02))`,
with `22×22` violet corner brackets on all four corners. Inside: "GAME CODE" micro-label,
the code at 44px mono `.2em` with `0 0 26px` bloom, and the join URL at 13px
`--violet-muted` with `word-break: break-all`. Below: a `14px` amber ring spinner
(`2px` border, transparent top, `spin .8s linear`) + "Waiting for Second Player…" in 15px
amber. Spacer. **Start game** disabled — `rgba(216,190,250,.5)` text on
`rgba(192,140,245,.1)`, `cursor:not-allowed` (dimmed but still readable; do not go darker).
Enabled state = the standard violet fill. **Cancel** ghost.
Join-confirm screen reuses this card for the role/details block.

### 5. Join (`#screen-join`) — ref 3E
Wordmark, instruction copy, then the code input: full width, `20px` padding, 32px mono,
`.22em` tracking, centered, uppercase, brighter border `rgba(192,140,245,.45)` and
`inset 0 0 24px rgba(192,140,245,.2)`. **Join game** + **← Back**.
Field errors: 13px `--red`, directly under the input.

### 6. Live — shared phase (Obstacles / Deploy / Command / Status) — ref 3F
**Top strip** (used by every live screen): `1px solid rgba(192,140,245,.24)` bottom
border, space-between. Left: "GAME CLOCK" micro-label + 38px mono clock with violet
bloom. Right, right-aligned: "ROUND 3 / 6" micro-label, then a row of a `7px` breathing
violet lamp + the phase name at 21px `--violet-text`.
**Stage:** centered column — "PHASE ELAPSED" 14px `.30em` caps, then the 82px mono clock
inside a `8px 34px` padded box with `26×26` violet corner brackets on all four corners,
then a 15px `--violet-muted` line of context.
**Control bar:** `1px` violet top hairline, `12px` gap: `54px` undo (`↶`, 22px) and pause
(`⏸`, 17px) ghost icon buttons, then a flex-1 violet-fill **Begin <Next Phase>** button.
Disabled controls: `opacity:.4`.

### 7. Live — Ship / Squadron phase (split view) — ref 3G · **the primary screen**
Stage is `22px 20px`, column, `16px` gap.
**Active panel** (`flex:1`), amber:
`background: linear-gradient(180deg, rgba(232,163,61,.1), rgba(232,163,61,.02))`, `24px`
padding, `overflow:hidden`, `justify-content:space-between`, no border — the four `26×26`
`2px` amber corner brackets *are* the frame, plus the `fc-sweep` line on the top edge.
Contents top-to-bottom: header row = player name (20px Saira 500 `--amber-label`) and an
`ACTIVE` badge (13px mono `.14em` `--amber-badge`, `1px solid rgba(232,163,61,.55)`,
`4px 10px`); then the 68px mono clock with double amber bloom; then the button row —
**Pass** (`flex:1`, ghost amber) and **Done** (`flex:1.4`, amber fill, `1px solid #ffd79a`,
`0 0 24px` glow). Done becomes **Undo** in place per the existing single-step logic; keep
the same amber fill.
**Idle panel** (`flex:.6`): `1px solid rgba(192,140,245,.2)`, `20px 22px`, row,
space-between, vertically centered. Left: name 19px `--violet-idle` + "STANDING BY" 13px
`.20em`. Right: total-on-clock 26px mono `--violet-idle-num` + "ON CLOCK" 13px `.18em`.
**When the second player is active, mirror the treatment in violet** — violet gradient
wash, violet brackets, violet sweep line, violet-fill Done — and give the first player the
idle treatment. Pass hides outside the Ship phase, exactly as today.

### 8. Live — round complete, with 15-min warning banner — ref 3H
**Warning banner** (above the strip, full width): `11px` padding, centered,
`rgba(232,163,61,.16)` background, `1px solid rgba(232,163,61,.5)` bottom border, 14px
Saira 600 `.22em` caps `--amber-badge`, `fc-breathe 1.4s`. In the warning window the game
clock and its micro-label go amber (`--amber-hi` / `rgba(232,163,61,.8)`) with amber bloom.
**Overtime** uses the same banner in red (`rgba(240,90,110,.16)` / `.5` border, `--red`
text) with the clock in red, showing `+MM:SS`. **Paused** uses the amber banner reading
"GAME PAUSED" without the breathing animation.
**Stage:** centered, `0 40px` — a full-width centered gradient hairline, "ROUND 4
COMPLETE" at 30px mono with violet bloom, a second hairline, then the original sub-copy
("Continue to the next round, or end the game here.") at 16px, `max-width:280px`.
**Control bar:** **Begin Round 5** (`flex:1.5`, violet fill) + **End Game** (`flex:1`,
ghost red — `--red` text, `--red-line` border).

### 9. Stats (`#screen-stats`) — ref 3I
Header block with a `1px` violet bottom hairline: "GAME COMPLETE" 26px mono with bloom,
then the final-time line at 13px `--violet-muted` with the over/under figure in `--red`
when over. A small ghost **New** button sits top-right.
Scrolling body, `22px` gutters. Section heads are 13px `.26em` caps
`rgba(192,140,245,.75)`, `margin-bottom:12px`.
- **Pace analysis:** 14px body copy with inline mono figures in `--violet-hi`; then one
  card per player. First Player card: `1px solid rgba(232,163,61,.35)` + a top-down amber
  wash. Second Player card: `1px solid rgba(192,140,245,.28)`, no wash. Each is a
  space-between row: an `8px` glowing dot + name (17px) + "N activations · M:SS avg"
  (13px), and a pace badge — `OVER PACE` (13px mono, `--red`, red border) or `ON TRACK`
  (13px mono, `--green`, green border). Below, the "View highlighted activations →" link
  is 13px `.10em` caps `--violet-text`.
- **Total time on clock:** two rows (dot + name, right-aligned mono figure) split by a
  `rgba(192,140,245,.14)` hairline, then the share bar: `10px` tall,
  `rgba(192,140,245,.08)` track, two flex segments in amber and violet, each with
  `0 0 16px` glow of its own color. Per-round share bars use the same treatment.
- **Time by phase:** `1fr 1fr` grid, `10px` gap. Each cell: `1px solid rgba(192,140,245,.2)`,
  `13px 14px`, 13px label + 21px mono value.

### 10. Activity log (`#screen-activity`) — ref 3J
Header: "ALL ACTIVATIONS" 24px mono + ghost **Back**. Round headers are a row of "ROUND 3"
in 19px mono `.08em` plus a flex-1 violet hairline. Phase labels are 13px `.24em` caps
`rgba(192,140,245,.65)`. Normal rows: `12px 0`, `rgba(192,140,245,.14)` bottom hairline —
`8px` glowing dot, name (16px, tinted to the player's color), outcome ("Done" / "Passed",
14px `--violet-muted`), right-aligned 17px mono duration with `min-width:56px`.
**Slow rows** replace the hairline with `1px solid rgba(240,90,110,.45)` +
`rgba(240,90,110,.1)` background, `12px 10px` padding on `-10px` horizontal margins, a
`SLOW` badge (13px mono `.14em`, red border) in place of the outcome, and the duration in
`#ffb8c0`. Shared-phase rows are a dimmer space-between row with "(shared)" appended.

---

## Interactions & Behavior
Identical to the existing prototype — see `armada-clock.html`. Nothing in this restyle
changes navigation, the event log, undo semantics, pause math, the Supabase multi-device
sync, or the pace/outlier thresholds. What the restyle adds:
- Decorative loops (`fc-blink`, `fc-breathe`, `fc-sweep`, `spin`) with no state coupling.
- `:active` press feedback on every button (wash for ghosts, glow-drop for fills).
- The active/idle player treatment swaps color family with `currentActivePlayer()`.
- The warning / overtime / paused banners drive the game clock's color and bloom in
  addition to showing the banner.

## State Management
No new state. The design consumes exactly what the prototype already derives from its
event log: `isPaused()`, `isBetweenRounds()`, `currentPhaseEvent()`, `currentActivePlayer()`,
`canPass()`, `canUndo()`, the warning/overtime thresholds, and the stats aggregation.

## Assets
None. No images, no icon fonts, no SVG. The only glyphs are `↶` and `⏸`/`▶` (as in the
original) and CSS-drawn brackets, rules, dots and bars. Fonts load from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Saira:wght@300;400;500;600&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

Use a real `<link>` (or self-host), not `@import` inside `<style>` as the prototype does —
`@import` blocks and delays first paint.

## Files
| File | What it is |
|---|---|
| `Fleet Chrono Design.dc.html` | The design document. Turn 3 (top) is the approved full screen set, 3A–3J. Turn 2 is the violet/magenta accent comparison. Turn 1 is the three original direction explorations (Bridge Console, Holo Tactical, Fleet Command) — kept for context. |
| `armada-clock.html` | The existing working prototype to restyle. Structure, ids, and JS are unchanged by this work. |
| `README.md` | This document. |

## Notes for implementation
- Square corners inside the frame, hairlines instead of filled cards, and bloom on live
  numerals are the three things that make this direction work. If any one is softened it
  reads like a generic dark theme.
- The 13px floor is a hard requirement: this is read from ~3 feet on a table.
- The design assumes a lit game room, so the glow is used for *emphasis*, not as the only
  contrast mechanism — every text color also passes on its own.
- The prototype's device frame (`max-width:420px`, `min-height:760px`, rounded) was kept
  deliberately. On a real phone it should become full-bleed with safe-area insets; keep the
  `28px` radius only if the frame remains visible on desktop.
