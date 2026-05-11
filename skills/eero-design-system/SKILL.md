---
name: eero-design-system
description: "Enforce the eero Dashboard design system for all UI and styling changes. Use this skill whenever modifying CSS, creating components, adding icons, adjusting colors, changing typography, or building any UI element in the eero Dashboard. Also use when reviewing UI code for design consistency. Triggers: styling, CSS, component design, icon choice, color, theme, layout, UI review, dark mode, light mode, responsive."
---

Enforce the eero Dashboard design system — a **minimal, data-dense, dark-first** aesthetic with emoji-based decorative iconography, Lucide React for action icons, and a restrained color palette. Closer to a macOS system preference panel than a flashy SaaS dashboard.

## Color System

### CSS Variables (ALWAYS use these — never hardcode colors)

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg` | `#0c0e14` | `#f2f4f8` | Page background |
| `--bg-card` | `#151821` | `#ffffff` | Card/panel backgrounds |
| `--bg-card-hover` | `#1e2230` | `#f0f2f6` | Hover state on cards/rows |
| `--bg-input` | `#111319` | `#e9ecf2` | Input field backgrounds |
| `--border` | `#252938` | `#d4d8e3` | All borders |
| `--text` | `#eaecf5` | `#181b26` | Primary text |
| `--text-muted` | `#9ca0b0` | `#555a6e` | Secondary/label text |
| `--text-dim` | `#6b7084` | `#868ca0` | Tertiary/placeholder text |
| `--accent` | `#5b93ff` | `#3574e8` | Primary actions, links, focus |
| `--accent-hover` | `#7aabff` | `#2460d0` | Accent hover state |
| `--green` | `#2dd4a0` | `#0a8c5e` | Online, success, healthy |
| `--yellow` | `#f5b731` | `#c07a00` | Warning, caution |
| `--red` | `#f06464` | `#cc2222` | Offline, error, danger |

### Semantic Color Rules
- **Green** → Online, connected, success, healthy, toggle-on
- **Yellow** → Warning, caution, 2.4 GHz band
- **Red** → Offline, error, danger, blocked, paused
- **Blue (accent)** → Primary actions, 5 GHz band, focus rings, selected states

## Typography

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page title (h1) | `1.5rem` | 700 | |
| Section header (h2) | `1rem` | 600 | |
| Subsection (h3) | `0.9rem` | 500 | Often prefixed with emoji |
| Body text | `0.85rem` | 400 | |
| Table headers | `0.75rem` | 500 | `text-transform: uppercase; letter-spacing: 0.05em` |
| Labels / meta | `0.75–0.8rem` | 400 | `color: var(--text-muted)` |
| Monospace values | `0.8rem` | 400 | `'JetBrains Mono', 'SF Mono', ui-monospace, monospace` — IPs, MACs, speeds |
| Hero numbers | `2.8rem` | 800 | Speed test results |

Body font: `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`
Always apply: `-webkit-font-smoothing: antialiased;`

## Spacing & Radius

**Base unit: 8px.** Multiples of 2px/4px for fine adjustments.

| Context | Value |
|---|---|
| Card padding | `18–22px` |
| Section gap | `16–24px` |
| Button padding | `10px 24px` (primary), `5px 14px` (small) |

| Radius | Value | Usage |
|---|---|---|
| `--radius` | `14px` | Cards, panels, dialogs |
| `--radius-sm` | `8px` | Buttons, inputs, badges |
| `22px` | — | Toggle switches (pill) |

## Icon System

1. **Lucide React** (`lucide-react`) for ALL action button icons — render at `18×18` default, `16×16` compact, `14×14` inline. Use `currentColor`.
2. **Emoji** for decorative/categorical icons — device types, section headers, navigation, connection badges, empty states.
3. **Plain text** for menu items — no emoji or icon prefix in context menus.

### Key Emoji Dictionary

| Emoji | Meaning | | Emoji | Meaning |
|---|---|---|---|---|
| 📱 | Phone/tablet | | 📡 | Network node/eero |
| 💻 | Laptop | | 🏠 | Gateway node |
| 🖥️ | Desktop | | 🔑 | Wi-Fi password |
| 📺 | TV/streaming | | 🚀 | Speed test/QoS |
| 🎮 | Game console | | 🔒 | Security |
| 🌐 | Unknown device/DNS | | ⚡ | Priority device |
| 📶 | Wireless connection | | 👤 | User profile |
| 🔌 | Wired connection | | 💚 | Health tab |

## Component Patterns

### Cards
```css
background: var(--bg-card);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 18px;
/* Hover: background: var(--bg-card-hover); border-color: var(--accent); */
```

### Tables
```css
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { padding: 8px 12px; color: var(--text-muted); font-weight: 500;
                 font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: var(--bg-card-hover); }
```

### Toggle Switches
- Dimensions: `40×22px` track, `16×16px` knob
- Off: `background: var(--border)` | On: `background: var(--green)`
- Always pair with `.toggle-row` layout (flex, space-between, hover background)

### Buttons
| Variant | Background | Border | Text |
|---|---|---|---|
| `.btn-primary` | `var(--accent)` | none | white, 600 |
| `.btn-cancel` | transparent | `1px solid border` | muted |
| `.btn-danger` | `var(--red)` | none | white |
| `.btn-icon` | transparent | `1px solid border` | muted |

### Empty States
```css
text-align: center; padding: 40px 20px;
background: rgba(0,0,0,0.15);
border-radius: var(--radius);
border: 1px dashed var(--border);
/* Large emoji icon: 2.5rem, muted italic text: 0.85rem */
```

## Animation Timing

| Type | Duration | Easing |
|---|---|---|
| UI interactions | `0.15s` | `ease` |
| Toggle/slider | `0.2s` | `ease` |
| Modals/dialogs | `0.25s` | `ease-out` |
| Content fade-in | `0.3s` | `ease` |

**Never exceed 0.3s** for any animation.

## Layout

- Sidebar: `position: fixed; width: 220px`
- Active nav: `3px left border, accent color, border-radius: 0 8px 8px 0`
- Mobile breakpoint: drawer pattern at `768px`
- Grid: `repeat(auto-fill, minmax(320px, 1fr))` for cards

## DO ✅ / DON'T ❌

**DO:** Use CSS variables for all colors. Use Lucide React for action icons. Use monospace font for technical values. Test both dark and light themes. Use `.toggle-row` for booleans. Use `.data-table` for tabular data. Use empty state pattern with dashed border.

**DON'T:** Hardcode hex colors. Use emoji for action buttons. Install icon libraries beyond Lucide. Use radius values outside scale (8/14/22/50%). Use font sizes outside the established scale. Add animations longer than 0.3s. Use undocumented emoji.
