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
| `--bg`            | `#0f1117`   | `#f5f6fa`   | Page background              |
| `--bg-card`       | `#1a1d27`   | `#ffffff`   | Card/panel backgrounds       |
| `--bg-card-hover` | `#22263a`   | `#f0f1f5`   | Hover state on cards/rows    |
| `--bg-input`      | `#14161e`   | `#f5f6fa`   | Input field backgrounds      |
| `--border`        | `#2a2e3d`   | `#e0e2ea`   | All borders                  |
| `--text`          | `#e4e6ef`   | `#1a1d27`   | Primary text                 |
| `--text-muted`    | `#a0a4b0`   | `#6b7280`   | Secondary/label text         |
| `--text-dim`      | `#7a7f8d`   | `#9ca3af`   | Tertiary/placeholder text    |
| `--accent`        | `#6ea0ff`   | `#3b7dff`   | Primary actions, links, focus |
| `--accent-hover`  | `#8bb5ff`   | `#5b93ff`   | Accent hover state           |
| `--green`         | `#34d399`   | `#0d9668`   | Online, success, healthy     |
| `--yellow`        | `#fbbf24`   | `#d97706`   | Warning, caution             |
| `--red`           | `#f87171`   | `#dc2626`   | Offline, error, danger       |

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
| Page title (h1) | `1.5rem`  | 700    |                                    |
| Section header (h2) | `1rem` | 600   |                                    |
| Subsection (h3) | `0.9rem`  | 500    | Often prefixed with emoji          |
| Body text        | `0.85rem` | 400    |                                    |
| Table headers    | `0.75rem` | 500    | `text-transform: uppercase; letter-spacing: 0.05em` |
| Labels / meta    | `0.75–0.8rem` | 400 | `color: var(--text-muted)`        |
| Monospace values | `0.8rem`  | 400    | `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace` — IPs, MACs, speeds |
| Hero numbers     | `2.8rem`  | 800    | Speed test results (responsive: `1.5rem` mobile) |
| Empty state icon | `2.5rem`  | —      | Emoji in `.empty-icon`             |

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
| `--radius`    | `12px` | Cards, panels, dialogs    |
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
```
- Hover: `background: var(--bg-card-hover); border-color: var(--accent);`
- Hover shadow: `0 4px 16px rgba(110,160,255,0.08)`
- Error variant: red border, red text
- Full-width variant via `.full-width` class

### Tables (Device Table Reference)
```css
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { padding: 8px 12px; color: var(--text-muted); font-weight: 500;
                 font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: var(--bg-card-hover); }
```
- Monospace cells: `font-family: 'SF Mono', monospace; font-size: 0.8rem`
- Offline rows: `opacity: 0.45`
- Sortable headers: cursor pointer, `↕ / ↑ / ↓` indicators, hover color accent

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
- Monospace inputs (IPs, MACs): add `font-family: 'SF Mono', monospace`

### Empty States
```css
text-align: center; padding: 40px 20px;
background: rgba(0,0,0,0.15);
border-radius: var(--radius);
border: 1px dashed var(--border);
```
- Large emoji icon: `font-size: 2.5rem; margin-bottom: 8px`
- Muted italic text: `font-size: 0.85rem; color: var(--text-dim); font-style: italic`

### Confirmation Dialogs
```css
backdrop: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
dialog: background var(--bg-card), border 1px solid var(--border), radius var(--radius), padding 28px
animation: slideUp 0.25s ease-out
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
| UI interactions  | `0.15s`  | `ease` (default)                  |
| Toggle/slider    | `0.2s`   | `ease`                            |
| Modals/dialogs   | `0.25s`  | `ease-out`                        |
| Sidebar drawer   | `0.28s`  | `cubic-bezier(0.4, 0, 0.2, 1)`   |
| Content fade-in  | `0.3s`   | `ease`                            |

### Named Animations
- `spin` — Infinite rotation for loading spinners
- `fade-in` — Opacity 0→1 + slight translateY
- `slideUp` — Modal entrance (opacity + translateY 20px→0)
- `pulse-border` — Red border pulse for error states

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
- Use empty state pattern (dashed border, large emoji, muted italic text) when no data
- Maintain consistent spacing (8px base grid)

### DON'T ❌
- Don't use system emoji in UI components — use Lucide React icons instead
- Don't install additional icon libraries — Lucide React is the single icon source
- Don't use raw color hex values — always use `var(--token)`
- Don't add new CSS variables without documenting them here
- Don't use `border-radius` values outside the established scale (8px, 12px, 22px, 50%)
- Don't use font sizes outside the established scale
- Don't add animations longer than 0.3s
- Don't use icons not listed in the Lucide Icon Reference without adding them to the table first
- Don't use different emoji for the same concept across components
