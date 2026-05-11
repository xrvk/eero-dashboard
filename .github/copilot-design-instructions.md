# 🎨 eero Dashboard — Design System Agent Instructions

> Use these instructions when making any UI, styling, or design changes to the eero Dashboard.
> This file codifies the visual language established across the device table, settings page, and health tab.

---

## Core Identity

The eero Dashboard uses a **minimal, data-dense, dark-first** design with Lucide React iconography, atmospheric gradients, and a refined color palette. The aesthetic is functional and calm — closer to a macOS system preference panel than a flashy SaaS dashboard.

---

## Color System

### CSS Variables (always use these — never hardcode colors)

| Token              | Dark Value   | Light Value  | Usage                        |
|-------------------|-------------|-------------|------------------------------|
| `--bg`            | `#0c0e14`   | `#f2f4f8`   | Page background              |
| `--bg-card`       | `#151821`   | `#ffffff`   | Card/panel backgrounds       |
| `--bg-card-hover` | `#1e2230`   | `#f0f2f6`   | Hover state on cards/rows    |
| `--bg-input`      | `#111319`   | `#e9ecf2`   | Input field backgrounds      |
| `--border`        | `#252938`   | `#d4d8e3`   | All borders                  |
| `--text`          | `#eaecf5`   | `#181b26`   | Primary text                 |
| `--text-muted`    | `#9ca0b0`   | `#555a6e`   | Secondary/label text         |
| `--text-dim`      | `#6b7084`   | `#868ca0`   | Tertiary/placeholder text    |
| `--accent`        | `#5b93ff`   | `#3574e8`   | Primary actions, links, focus |
| `--accent-hover`  | `#7aabff`   | `#2460d0`   | Accent hover state           |
| `--accent-glow`   | `rgba(91,147,255,0.15)` | `rgba(53,116,232,0.1)` | Accent glow/shadow effects |
| `--green`         | `#2dd4a0`   | `#0a8c5e`   | Online, success, healthy     |
| `--green-glow`    | `rgba(45,212,160,0.12)` | `rgba(10,140,94,0.08)` | Green glow effects |
| `--yellow`        | `#f5b731`   | `#c07a00`   | Warning, caution             |
| `--red`           | `#f06464`   | `#cc2222`   | Offline, error, danger       |
| `--shadow-card`   | `0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px var(--border)` | lighter | Card depth shadow |
| `--shadow-elevated` | `0 8px 32px rgba(0,0,0,0.5), ...` | lighter | Dialogs, menus, drawers |
| `--gradient-subtle` | `linear-gradient(135deg, accent-glow, green-glow)` | — | Empty states, node controls |
| `--gradient-card` | `linear-gradient(180deg, rgba(255,255,255,0.02), transparent)` | — | Card surface sheen |

### Semantic Color Rules
- **Green** → Online, connected, success, healthy, toggle-on
- **Yellow** → Warning, caution, 2.4 GHz band
- **Red** → Offline, error, danger, blocked, paused
- **Blue (accent)** → Primary actions, 5 GHz band, focus rings, selected states
- **Green (alternate)** → 6 GHz band

---

## Typography

```css
font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

| Element          | Size      | Weight | Notes                              |
|-----------------|-----------|--------|------------------------------------|
| Page title (h1) | `1.2rem`  | 700    | `letter-spacing: -0.02em`          |
| Section header (h2) | `1rem` | 600   |                                    |
| Subsection (h3) | `0.9rem`  | 500    | Prefixed with Lucide icon component |
| Body text        | `0.85rem` | 400    | `line-height: 1.55; letter-spacing: -0.01em` |
| Table headers    | `0.75rem` | 500    | `text-transform: uppercase; letter-spacing: 0.05em` |
| Labels / meta    | `0.75–0.8rem` | 400 | `color: var(--text-muted)`        |
| Monospace values | `0.8rem`  | 400    | `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace` — IPs, MACs, speeds |
| Hero numbers     | `3rem`    | 800    | Gradient text: `background: linear-gradient(135deg, var(--accent), var(--green))` with `-webkit-background-clip: text` (responsive: `1.8rem` mobile) |
| Empty state icon | `40px`   | —      | Lucide icon with `color: var(--text-dim); opacity: 0.6` |

### Font smoothing
Always apply: `-webkit-font-smoothing: antialiased;`

---

## Spacing

**Base unit: 8px.** Use multiples of 2px/4px for fine adjustments.

| Context            | Value       |
|-------------------|-------------|
| Card padding       | `18–22px`   |
| Section gap        | `16–24px`   |
| Item gap           | `10–14px`   |
| Input padding      | `7px 10px`  |
| Button padding     | `10px 24px` (primary), `5px 14px` (small) |
| Page content pad   | `24px 28px` (desktop), `16px` (mobile) |

---

## Border Radius

| Token          | Value  | Usage                     |
|---------------|--------|---------------------------|
| `--radius`    | `14px` | Cards, panels, dialogs    |
| `--radius-sm` | `8px`  | Buttons, inputs, badges   |
| `22px`        | —      | Toggle switches (pill)    |
| `50%`         | —      | Status dots, circular elements |

---

## Component Patterns

### Cards
```css
background: var(--bg-card);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 18px;
box-shadow: var(--shadow-card);
background-image: var(--gradient-card);
```
- Hover: `background: var(--bg-card-hover); border-color: var(--accent); transform: translateY(-1px);`
- Hover shadow: `0 6px 24px var(--accent-glow), var(--shadow-card)`
- Error variant: red border, red text
- Full-width variant via `.full-width` class
- **Node cards:** status-colored left border (`border-left: 3px solid var(--green/yellow/red)`)

### Tables (Device Table Reference)
```css
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { padding: 8px 12px; color: var(--text-muted); font-weight: 500;
                 font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: var(--bg-card-hover); }
```
- Monospace cells: `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace; font-size: 0.8rem`
- Offline rows: `opacity: 0.45`
- Sortable headers: cursor pointer, Lucide `ArrowUp`/`ArrowDown`/`ArrowUpDown` indicators, hover color accent

### Toggle Switches
- Dimensions: `40×22px` track, `16×16px` knob
- Off: `background: var(--border)`
- On: `background: var(--green)`
- Transition: `0.2s`
- Always pair with `.toggle-row` layout (flex, space-between, hover background)
- Include `.toggle-name` (0.9rem, weight 500) and `.toggle-desc` (0.75rem, muted)

### Buttons
| Variant       | Background           | Border              | Text           |
|--------------|---------------------|---------------------|----------------|
| `.btn-primary` | `var(--accent)`     | none                | white, 600     |
| `.btn-cancel`  | transparent         | `1px solid border`  | muted          |
| `.btn-text`    | transparent         | none                | muted → text   |
| `.btn-icon`    | transparent         | `1px solid border`  | muted          |
| `.btn-danger`  | `var(--red)`        | none                | white          |

- All transitions: `0.15s`
- Disabled: `opacity: 0.5; cursor: default`
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px`

### Inputs
```css
padding: 7px 10px;
background: var(--bg-card);
border: 1px solid var(--border);
border-radius: var(--radius-sm);
color: var(--text);
font-size: 0.8rem;
```
- Focus: `border-color: var(--accent)`
- Placeholder: `color: var(--text-dim)`
- Monospace inputs (IPs, MACs): add `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace`
- **Escape key:** All inline edit forms and add-forms support Escape to cancel/close

### Empty States
```css
text-align: center; padding: 48px 24px;
background: var(--gradient-subtle);
border-radius: var(--radius);
border: 1px dashed var(--border);
```
- Large Lucide icon: `size={40}`, `color: var(--text-dim); opacity: 0.6`
- Muted italic text: `font-size: 0.85rem; color: var(--text-dim); font-style: italic`

### Confirmation Dialogs
```css
backdrop: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
dialog: background var(--bg-card), border 1px solid var(--border), radius var(--radius), padding 32px
box-shadow: var(--shadow-elevated);
background-image: var(--gradient-card);
animation: slideUp 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

---

## Emoji Icon System

### Principles
1. **Lucide React for all icons.** All icons use `lucide-react` components with consistent sizing. No system emoji in the UI.
2. **Semantic consistency.** Each icon has one primary meaning (see table below).
3. **Size tiers:** Inline (`14–16px`), Standard (`18–20px`), Card icon (`20px` in `.general-card-icon`), Hero (`40px` in empty states).
4. **Wrapping:** Card-level icons use `<span className="general-card-icon">`. Section headers use Lucide components directly before h3 text.

### Lucide Icon Reference

All icons imported from `lucide-react`. Use `size` prop for sizing and they inherit `currentColor` automatically.

| Icon | Component | Usage |
|------|-----------|-------|
| Smartphone | `<Smartphone />` | Phone/tablet device type |
| Laptop | `<Laptop />` | Laptop device type |
| Monitor | `<Monitor />` | Desktop device type |
| Tv | `<Tv />` | TV/streaming device type |
| Speaker | `<Speaker />` | Smart speaker device type |
| Camera | `<Camera />` | Camera device type |
| Printer | `<Printer />` | Printer device type |
| Gamepad2 | `<Gamepad2 />` | Game console device type |
| Globe | `<Globe />` | Unknown device fallback, DNS section |
| Wifi | `<Wifi />` | Wireless connection badge |
| Cable | `<Cable />` | Wired connection badge |
| Radio | `<Radio />` | Network node / eero unit |
| Home | `<Home />` | Gateway node |
| Key | `<Key />` | Wi-Fi password section |
| ArrowUpCircle | `<ArrowUpCircle />` | Firmware/updates section |
| Shield | `<Shield />` | Security section header |
| Gauge | `<Gauge />` | QoS section header |
| Search | `<Search />` | Search field, diagnostics |
| RotateCcw | `<RotateCcw />` | Reboot / network restart |
| Lightbulb | `<Lightbulb />` | Node controls (LED) |
| User | `<User />` | User profile |
| Users | `<Users />` | Guest network |
| Moon | `<Moon />` | Dark theme |
| Sun | `<Sun />` | Light theme |
| SunMoon | `<SunMoon />` | Auto theme |
| HeartPulse | `<HeartPulse />` | Health tab |
| Settings | `<Settings />` | Settings nav |
| Zap | `<Zap />` | Priority device |
| AlertTriangle | `<AlertTriangle />` | Warning / error |
| CheckCircle | `<CheckCircle />` | Success / up-to-date |
| Info | `<Info />` | Info notice |
| Ban | `<Ban />` | Blacklist / blocked |
| RefreshCw | `<RefreshCw />` | Refresh button |
| LayoutGrid | `<LayoutGrid />` | Grid view toggle |
| List | `<List />` | List view toggle |
| ArrowUp/Down | `<ArrowUp />` / `<ArrowDown />` | Sort indicators, speed arrows |
| X | `<X />` | Close / cancel buttons |
| Plus | `<Plus />` | Add / create buttons |
| ChevronRight/Down | `<ChevronRight />` / `<ChevronDown />` | Expand/collapse |

---

## Layout

### App Shell
```
┌──────────────────────────────────┐
│ Sidebar (220px) │ Main (flex: 1) │
│   Logo           │   Header       │
│   Nav items      │   (sticky)     │
│   Networks       │                │
│   User footer    │   Content      │
│                  │   (max ~1100px)│
└──────────────────────────────────┘
```
- Sidebar: `position: fixed; width: 220px`
- Active nav: `3px left border, accent color, border-radius: 0 8px 8px 0`
- Mobile: drawer pattern with overlay at `768px`

### Grid Systems
```css
/* Device/profile cards */
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
/* Node cards */
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
/* Activity panels (2-col → stack on mobile) */
grid-template-columns: 1fr 1fr; gap: 16px;
```

### Responsive Breakpoints
| Breakpoint | Change |
|-----------|--------|
| `≤900px`  | Hide table columns |
| `≤768px`  | Sidebar → drawer, reduce padding |
| `≤700px`  | Activity panels stack, table responsive |
| `≤600px`  | Further padding reduction |

---

## Animation & Transitions

| Type              | Duration | Easing                            |
|------------------|----------|-----------------------------------|
| UI interactions  | `0.15–0.2s` | `ease` (default)               |
| Toggle/slider    | `0.2s`   | `ease`                            |
| Modals/dialogs   | `0.25s`  | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| Sidebar drawer   | `0.28s`  | `cubic-bezier(0.4, 0, 0.2, 1)`   |
| Card hover lift  | `0.2s`   | `ease` — `transform: translateY(-1px)` |
| Device drawer    | `0.25s`  | `cubic-bezier(0.4, 0, 0.2, 1)` — slideInRight |

### Named Animations
- `spin` — Infinite rotation for loading spinners
- `fadeIn` — Opacity 0→1 + slight translateY(4px)
- `cardReveal` — Opacity 0→1 + translateY(8px), used for staggered grid entry
- `slideUp` — Modal entrance (opacity + translateY 20px→0)
- `slideInRight` — Drawer entrance from right edge
- `tabEnter` — Tab content slide-fade (opacity + translateY 6px)
- `pulse-border` — Red border pulse for delete confirmation states

### Staggered Card Reveal
Device, node, and profile grids use `cardReveal` with cascading `animation-delay`:
```css
.device-grid > *:nth-child(1) { animation-delay: 0ms; }
.device-grid > *:nth-child(2) { animation-delay: 30ms; }
/* ... up to 240ms for 9+ items */
```

---

## Status Indicators

### Status Dots
- Size: `8×8px`, `border-radius: 50%`
- Online: `background: var(--green); box-shadow: 0 0 6px var(--green)`
- Offline: `background: var(--red); box-shadow: 0 0 6px var(--red)`
- Position: absolute, top-right of parent card

### Signal Strength Bars
- 5 bars: heights `4, 6, 8, 11, 14px`, width `3px`, gap `1.5px`
- Active: `var(--green)`, Inactive: `var(--border)`

### Band Colors
| Band    | Color                                          |
|---------|------------------------------------------------|
| 2.4 GHz | `linear-gradient(90deg, var(--yellow), #e8b500)` |
| 5 GHz   | `linear-gradient(90deg, var(--accent), #8bb5ff)` |
| 6 GHz   | `linear-gradient(90deg, var(--green), #2ecb9b)` |
| Wired   | `var(--text-muted)` solid                      |

---

## Design Principles (DO / DON'T)

### DO ✅
- Use CSS variables for all colors — never hardcode hex values
- Use Lucide React icons (`lucide-react`) for all iconography — no system emoji in the UI
- Use `currentColor` inheritance — icons automatically adapt to dark/light themes
- Keep cards at `border-radius: var(--radius)` (12px)
- Use monospace font for technical values (IPs, MACs, speeds, versions)
- Test both dark and light themes
- Use `transition: 0.15s` on interactive elements
- Use `.toggle-row` pattern for boolean settings
- Use `.data-table` pattern for tabular data
- Use empty state pattern (dashed border, Lucide icon, muted italic text) when no data
- Maintain consistent spacing (8px base grid)
- Add `onKeyDown` Escape handler to all inline forms and edit modes
- Use `var(--shadow-card)` for card depth and `var(--shadow-elevated)` for overlays
- Use `var(--gradient-card)` for card surface sheen

### DON'T ❌
- Don't use system emoji in UI components — use Lucide React icons instead
- Don't install additional icon libraries — Lucide React is the single icon source
- Don't use raw color hex values — always use `var(--token)`
- Don't add new CSS variables without documenting them here
- Don't use `border-radius` values outside the established scale (8px, 14px, 22px, 50%)
- Don't use font sizes outside the established scale
- Don't add animations longer than 0.3s (except staggered delays which cascade up to 240ms)
- Don't use icons not listed in the Lucide Icon Reference without adding them to the table first
- Don't use different icons for the same concept across components
- Don't use flat `rgba(0,0,0,...)` backgrounds — use `var(--gradient-subtle)` for tinted areas
- Don't add inline forms without Escape key cancel support
