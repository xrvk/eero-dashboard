# 🎨 eero Dashboard — Design System Agent Instructions

> Use these instructions when making any UI, styling, or design changes to the eero Dashboard.
> This file codifies the visual language established across the device table, settings page, and health tab.

---

## Core Identity

The eero Dashboard uses a **minimal, data-dense, dark-first** design with emoji-based decorative iconography, Lucide React for action icons, and a restrained color palette. The aesthetic is functional and calm — closer to a macOS system preference panel than a flashy SaaS dashboard.

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
| `--accent-glow`   | `rgba(91,147,255,0.15)` | `rgba(53,116,232,0.1)` | Focus/selection glow |
| `--green`         | `#2dd4a0`   | `#0a8c5e`   | Online, success, healthy     |
| `--green-glow`    | `rgba(45,212,160,0.12)` | `rgba(10,140,94,0.08)` | Online status glow |
| `--yellow`        | `#f5b731`   | `#c07a00`   | Warning, caution             |
| `--red`           | `#f06464`   | `#cc2222`   | Offline, error, danger       |
| `--shadow-card`   | `0 1px 3px rgba(0,0,0,0.3), …` | `0 1px 3px rgba(0,0,0,0.06), …` | Card elevation |
| `--shadow-elevated` | `0 8px 32px rgba(0,0,0,0.5), …` | `0 8px 32px rgba(0,0,0,0.12), …` | Modal/drawer elevation |
| `--gradient-subtle` | (accent→green, 4%→2%) | (accent→green, 3%→2%) | Subtle page gradient |
| `--gradient-card` | (white 2%→transparent) | (white 60%→transparent) | Card surface sheen |

### Semantic Color Rules
- **Green** → Online, connected, success, healthy, toggle-on
- **Yellow** → Warning, caution, 2.4 GHz band
- **Red** → Offline, error, danger, blocked, paused
- **Blue (accent)** → Primary actions, 5 GHz band, focus rings, selected states
- **Green (alternate)** → 6 GHz band

### RGB Decomposition Variables
For `rgba()` transparency effects, use the `--*-rgb` variants instead of hardcoding color values:

| Token             | Dark Value         | Light Value         | Usage                         |
|-------------------|--------------------|---------------------|-------------------------------|
| `--accent-rgb`    | `110, 160, 255`    | `59, 125, 255`      | `rgba(var(--accent-rgb), 0.1)` |
| `--green-rgb`     | `52, 211, 153`     | `13, 150, 104`      | `rgba(var(--green-rgb), 0.1)`  |
| `--red-rgb`       | `248, 113, 113`    | `220, 38, 38`       | `rgba(var(--red-rgb), 0.1)`    |
| `--yellow-rgb`    | `251, 191, 36`     | `217, 119, 6`       | `rgba(var(--yellow-rgb), 0.1)` |
| `--border-rgb`    | `42, 46, 61`       | `216, 219, 229`     | `rgba(var(--border-rgb), 0.3)` |

**Rule:** Never hardcode `rgba(110,160,255,0.1)` — always use `rgba(var(--accent-rgb), 0.1)` so colors adapt to the active theme.

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
| Monospace values | `0.8rem`  | 400    | `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace` — IPs, MACs, speeds. Use `.mono` utility class. |
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
- Hover shadow: `var(--shadow-card)` or `var(--shadow-elevated)` for raised cards
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
- Monospace cells: `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace; font-size: 0.8rem`
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
- Monospace inputs (IPs, MACs): add `font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace`

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
1. **Lucide React for action icons.** All interactive button icons use Lucide React SVG components (`lucide-react`) with `currentColor` — typically rendered at `18×18` (or `16×16` small).
2. **Emoji for decorative/categorical icons.** Device types, section headers, navigation, connection badges, and empty states still use emoji.
3. **Plain text for menu items.** Context menu actions (Rename, Reserve IP, Pause, Block) use text-only — no emoji or icon prefix.
4. **Size tiers:** Lucide action icons: `18×18` (standard), `16×16` (compact/toolbar), `14×14` (inline). Emoji decorative: `1.1–1.3rem` (card icons), `2.5rem` (empty states).
5. **Wrapping:** Lucide icon buttons use `.btn-icon-sm` class. Card-level emoji use `<span className="general-card-icon">`.

### SVG Icon Reference (action buttons via Lucide React)

All icons come from Lucide React (`lucide-react` package). Import by name and render as components with `size`, `strokeWidth`, and `className` props. Lucide follows the Feather icon convention: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

| Icon | SVG Key Elements | Usage |
|------|-----------------|-------|
| Eye (show) | `<path d="M1 12s4-8 11-8..."/><circle cx="12" cy="12" r="3"/>` | Show password `.btn-icon-sm` |
| Eye-off (hide) | `<path .../><line x1="1" y1="1" x2="23" y2="23"/>` | Hide password `.btn-icon-sm` |
| Copy | `<rect x="9" y="9".../><path d="M5 15H4..."/>` | Copy to clipboard `.btn-icon-sm` |
| Edit/pencil | `<path d="M11 4H4a2 2 0 0 0-2 2v14..."/><path d="M18.5 2.5..."/>` | Edit action `.btn-icon-sm` |
| Check | `<polyline points="20 6 9 17 4 12"/>` | Copied/success confirmation |
| Trash | `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14..."/>` | Delete `.btn-icon` |
| Refresh | `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15..."/>` | Reboot `.btn-action` |
| Search | `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21".../>` | Search field `.search-icon` |
| Chart | `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>` | Chart view toggle |
| Table/Grid | `<rect .../><line .../>` (grid lines) | Table view toggle |
| Download | `<path d="M21 15v4..."/><polyline points="7 10 12 15 17 10"/>` | Export button |

### Canonical Emoji Dictionary

| Emoji | Meaning | CSS Class / Context |
|-------|---------|-------------------|
| 📱 | Phone / tablet device | `.device-icon`, sidebar nav |
| 💻 | Laptop | `.device-icon` |
| 🖥️ | Desktop | `.device-icon` |
| 📺 | TV / streaming | `.device-icon` |
| 🔊 | Speaker / smart speaker | `.device-icon` |
| 📷 | Camera | `.device-icon` |
| 🖨️ | Printer | `.device-icon` |
| 🎮 | Game console | `.device-icon` |
| 🌐 | Unknown device / DNS / globe | `.device-icon` fallback, section header |
| 📶 | Wireless connection | inline badge |
| 🔌 | Wired connection | inline badge |
| 📡 | Network node / eero unit | `.general-card-icon`, group header, card icon |
| 🏠 | Gateway node | `.node-icon` |
| 🔑 | Wi-Fi password | `.general-card-icon` |
| ⬆️ | Firmware / updates | `.general-card-icon` |
| 🔒 | Security section | section h3 prefix |
| 🚀 | Speed test / QoS | section h3 prefix, button text |
| 🔍 | Search / diagnostics | `.search-icon`, section h3 prefix, empty state |
| 🔄 | Reboot / refresh | button text, dialog |
| ✏️ | **REMOVED** — use plain text "Edit" / "Rename" buttons instead | `.btn-text` exclusively |
| 🗑 | Delete / clear | `.btn-text` |
| 📋 | Copy to clipboard | `.btn-text` |
| 📌 | Reserve IP / pin | `.btn-text`, badge |
| ⏸️ | Pause internet | dialog, button |
| 🚫 | Block device | dialog |
| ✅ | Success / up-to-date | status text |
| ⚠️ | Warning / error | status text, confirm dialog |
| ⚡ | Priority device | `.priority-badge` |
| ℹ️ | Info notice | inline info block |
| 👤 | User profile | sidebar, profile cards, device drawer |
| 👥 | Guest network / multiple users | empty state |
| 👁️ | Show password | `.btn-text` toggle |
| 🙈 | Hide password | `.btn-text` toggle |
| 🌙 | Dark theme | theme switcher |
| ☀️ | Light theme | theme switcher |
| 🌗 | Auto theme | theme switcher |
| 💚 | Health tab | sidebar nav |

### Rules for Icons
1. **Action buttons** → use Lucide React icon components with `currentColor` (never emoji).
2. **Menu/text buttons** → plain text only, no emoji or icon prefix.
3. **Decorative/categorical** → emoji is fine (device types, section headers, navigation, connection badges, empty states).
4. Check the SVG Icon Reference above before creating new icons — reuse existing ones.
5. New icons should come from the Lucide React library; only use inline SVG if Lucide doesn't have the icon.
6. Test in both dark and light themes — `currentColor` handles this automatically.

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
- Use Lucide React icon components (`lucide-react`) for all action button icons
- Use plain text for context menu items (no emoji prefix)
- Keep cards at `border-radius: var(--radius)` (14px)
- Use monospace font for technical values (IPs, MACs, speeds, versions) — `'JetBrains Mono', 'SF Mono', ui-monospace, monospace`
- Test both dark and light themes
- Use `transition: 0.15s` on interactive elements
- Use `.toggle-row` pattern for boolean settings
- Use `.data-table` pattern for tabular data
- Use empty state pattern (dashed border, large emoji, muted italic text) when no data
- Maintain consistent spacing (8px base grid)

### DON'T ❌
- Don't use emoji for action buttons — use Lucide React icons instead
- Don't install additional icon libraries beyond Lucide React — use Lucide or inline SVG
- Don't use raw color hex values — always use `var(--token)`
- Don't add new CSS variables without documenting them here
- Don't use `border-radius` values outside the established scale (8px, 14px, 22px, 50%)
- Don't use font sizes outside the established scale
- Don't add animations longer than 0.3s
- Don't use emoji not listed in the Canonical Dictionary for decorative purposes without adding it first
- Don't use different emoji for the same concept across components
