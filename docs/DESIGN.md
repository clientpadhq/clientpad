# ClientPad — WhatsApp-First Operational

Reference DESIGN.md for service-business CRM that lives inside WhatsApp. Green signals trust, blue drives action, white keeps it clean. Built for Lagos salons as much as for developers wiring client workflows.

## 1. Visual Theme & Atmosphere

WhatsApp-native but structured. Think WhatsApp chat embeds living inside a clean operational dashboard. No crypto-glow, no fintech gradients, no vague AI sparkle. Every pixel justifies itself with a business operation.

Mood: fast, trustworthy, simple, Nigerian-business-ready.

## 2. Color Palette & Roles

```
/* Brand */
--brand-green:         #0b8d4d
--brand-green-hover:   #20a35a
--brand-green-light:   #e8f5ee

/* CTAs & Actions */
--cta-blue:            #1463e9
--cta-blue-hover:      #1f6feb

/* Surfaces */
--bg:                  #ffffff
--bg-subtle:           #f8fafb
--surface:             #ffffff
--surface-hover:       #f5f7f9

/* Text */
--text-primary:        #101820
--text-secondary:      #526071
--text-muted:          #8b9aab
--text-inverse:        #ffffff

/* Borders */
--border:              #dbe2ea
--border-strong:       #cfd7e2
--border-hover:        #bcc5d1

/* Semantic */
--success:             #07833f
--success-bg:          #e8f5ee
--danger:              #e23f17
--danger-bg:           #fef2f2
--warning:             #d97706
--warning-bg:          #fffbeb

/* Code */
--code-bg:             #111c28
--code-text:           #e2e8f0

/* WhatsApp-specific */
--whatsapp-green:      #25d366
--whatsapp-green-bg:   #dcf8c6
--chat-bubble-in:      #dcf8c6
--chat-bubble-out:     #ffffff
--chat-border:         #e9edef
```

Rule: green = trust/status/success/WhatsApp connection. Blue = primary CTA only. Never swap their roles. WhatsApp green (#25d366) reserved exclusively for WhatsApp brand touchpoints (QR code, "Powered by WhatsApp" badges, chat bubble incoming). Dashboard CTA buttons use `--cta-blue`, not WhatsApp green.

## 3. Typography Rules

- **UI + body:** `Inter`, fallback `system-ui, -apple-system, sans-serif`.
- **Code + keys:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
- **Weights:** 520 (nav, labels), 610 (buttons, inputs), 760 (page headings), 780 (logo/brand).

Scale: 11 / 12 / 13 / 14 / 15 / 17 / 19 / 22 / 26 / 32.

- Body: 14px, line-height 1.5.
- Page headings: 22px, weight 760, `--text-primary`.
- Section headings: 15px, weight 610, `--text-primary`.
- Labels: 12px, weight 520, `--text-secondary`, uppercase tracking +0.5px.
- API keys, IDs, codes: monospace 13px, weight 520.
- Tabular figures (`font-variant-numeric: tabular-nums`) on all metric/number surfaces.

## 4. Component Stylings

**Buttons**
- Primary: `--cta-blue` fill, white text, radius 7px, padding 8/18, weight 610, 13px font. Hover darkens to `--cta-blue-hover`.
- Success/Confirm: `--brand-green` fill, white text, same sizing as primary.
- Secondary: white fill, 1px `--border`, `--text-primary`, radius 7px.
- Danger: `--danger` fill, white text, radius 7px.
- Disabled: `--bg-subtle` fill, `--text-muted` text, no border, cursor not-allowed.

**Cards / Panels**
- `--surface` fill, 1px solid `--border`, radius 8px, padding 20px.
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.04)`.
- Header section gets bottom border 1px `--border`, padding 14/20.
- Hover: border to `--border-hover`. No lift, no scale.

**Inputs**
- 1px solid `--border`, radius 7px, padding 8/12, 14px Inter weight 610, `--text-primary`.
- Placeholder: `--text-muted`, weight 520.
- Focus: border to `--cta-blue`, 0 0 0 2px rgba(20,99,233,0.12) box-shadow. 1px offset.
- Error: border to `--danger`, box-shadow to danger tint.
- Labels: 12px weight 520 `--text-secondary` above input, margin-bottom 4px.

**Tables**
- Full-width, border-collapse separate, border-spacing 0.
- Headers: 12px weight 520 `--text-secondary`, uppercase tracking +0.5px, padding 10/14, bottom border 1px `--border`.
- Rows: padding 10/14, 14px body, bottom border 1px `--border`.
- Hover row: `--bg-subtle` background.
- Monospace for key columns, ID columns.
- Sticky header on scrollable tables.

**Sidebar Navigation**
- Dark surface: `--code-bg` (#111c28) background.
- Items: 14px weight 520, `--text-muted` (#8b9aab). Padding 10/16.
- Active item: left-border accent `inset 3px 0 0 --brand-green`, text becomes white, weight 610.
- Hover: text to white, background rgba(255,255,255,0.04).
- Icons: lucide-react, 16px, same color as text.
- Logo area: brand green `--brand-green` wordmark, weight 780, 18px, padding 16px.

**Topbar**
- White background, bottom border 1px `--border`, height 48px.
- Breadcrumb / page title: 14px, weight 610, `--text-primary`.
- Right-side actions use `--text-secondary`, 13px.

**Code Blocks**
- `--code-bg` (#111c28) background, radius 8px, padding 16px.
- Monospace 13px, `--code-text` (#e2e8f0).
- Language tabs above block: 12px weight 520, `--text-secondary`, active tab gets `--cta-blue` bottom border.

**WhatsApp Chat Bubbles (Team Inbox)**
- Incoming (customer): `--chat-bubble-in` (#dcf8c6) background, radius 0/8/8/8, float left.
- Outgoing (business): `--chat-bubble-out` (#ffffff), 1px `--chat-border`, radius 8/0/8/8, float right.
- Timestamps: 12px `--text-muted`, below bubble.
- Composer: WhatsApp-style input bar, send button uses `--brand-green` (not WhatsApp green — this is the ClientPad brand touching the customer through WhatsApp infrastructure).

**Badges**
- Radius 12px (pill), padding 2/8, 11px weight 610.
- Success: `--success-bg` fill, `--success` text.
- Danger: `--danger-bg` fill, `--danger` text.
- Neutral: `--bg-subtle` fill, `--text-secondary` text.

**Kanban Pipeline**
- Columns: `--bg-subtle` background, radius 8px, min-width 260px.
- Column headers: 13px weight 610 `--text-primary`, count badge in `--text-muted`.
- Client cards: `--surface` fill, 1px `--border`, radius 7px, padding 12px. Drag shadow on hover.

**Charts (Revenue Dashboard)**
- LineChart SVG only. No dependency on charting libraries.
- Line color: `--brand-green`. Area fill: gradient `--brand-green` at 20% to transparent.
- Gridlines: 1px `--border`. Axes: 12px `--text-muted`.

**Login Screen**
- Split layout: form left (white `--bg`), preview/illustration right.
- Right panel: brand-green-tinted gradient background, showing dashboard preview mockup.
- Form fields follow input rules above.
- CTA: `--cta-blue` primary button.
- Logo: brand-green `--brand-green`, weight 780, 22px.

## 5. Layout Principles

- App shell: sidebar (240px) + main content area. Sidebar fixed, content scrolls.
- Main content: max-width 1200px within scrollable area, padded 24px.
- 4px base grid unit. Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.
- Page structure: Topbar → PageHeader (title + actions) → content panels.
- Forms: max-width 520px, vertical stack with 16px gap between fields.
- Quickstart section: tabbed code snippets in 5-tab row (curl, Python, Node.js, Go, Ruby).
- PWA: `manifest.webmanifest` with `theme_color: #0b8d4d`, `background_color: #ffffff`.

## 6. Depth & Elevation

ClientPad is flat and fast. Depth comes from borders, not shadows.

- Panels: `0 1px 3px rgba(0,0,0,0.04)` — barely perceptible.
- Modals: `0 8px 24px rgba(0,0,0,0.12)`, `--surface` fill, radius 10px.
- Dropdowns / popovers: `0 4px 12px rgba(0,0,0,0.08)`, 1px `--border`, radius 8px.
- No card-on-card shadow layering. No neumorphism. No glassmorphism.

## 7. Do's and Don'ts

**Do**
- Use green for trust signals: active nav state, success badges, WhatsApp connection indicators, revenue charts.
- Use blue exclusively for primary CTAs: "Connect WhatsApp", "Create API Key", "Send".
- Render API keys and IDs in monospace with show/hide toggles.
- Use `tabular-nums` on all metric displays, pipeline counts, and revenue figures.
- Keep WhatsApp chat UI faithful to WhatsApp — green incoming bubbles, white outgoing bubbles.
- Show empty states with actionable messaging, not vague illustrations.
- Prefer dense information over whitespace — this is an operational tool, not a marketing page.
- Use `lucide-react` for all icons. No emoji in UI chrome.

**Don't**
- Use WhatsApp green (#25d366) for dashboard CTAs or brand elements — it's reserved for WhatsApp-native touchpoints.
- Introduce a third accent color beyond green and blue.
- Add drop shadows to cards or panels beyond the defined minimal levels.
- Use gradients on buttons, headers, or cards (exception: chart area fills).
- Round corners beyond 10px.
- Add loading spinners with vague copy — use skeleton screens or specific status text.
- Add "AI-powered" badges, sparkle icons, or magical-glow motifs. ClientPad is operational infrastructure, not a mystery box.
- Use emoji in UI labels, buttons, or navigation.

## 8. Responsive Behavior

Three breakpoints:

**Default (>1180px)**
- Sidebar visible (240px), full nav with icons + labels.
- Tables full-width.
- Pipeline columns scroll horizontally.

**≤1180px**
- Sidebar collapses to icon-only rail (56px). Labels hidden, tooltips on hover.
- Table columns compress — hide secondary columns, show row expand for details.

**≤760px (Mobile)**
- Sidebar becomes horizontal bottom nav bar. Topbar simplified.
- Tables transform to stacked card layout — each row becomes a card with label:value pairs.
- Pipeline becomes vertical stack of columns, each internally scrollable.
- Forms go full-width.
- Login screen stacks vertically (form on top, preview below or hidden).
- Modal goes fullscreen.
- Font scale reduces by 1px across board.

## 9. Agent Prompt Guide

Bias: Inter UI at weights 520/610/760/780. Green (#0b8d4d) for trust, blue (#1463e9) for action. White surfaces, border-based separation, 7-8px radius. Monospace for keys/IDs. lucide-react icons. Dense operational layouts. WhatsApp-native chat UI with green incoming bubbles.

Reject: gradients on UI chrome, emoji in interface, generic AI sparkle, glassmorphism, card shadows beyond minimal, rounded corners past 10px, fintech neon, dark mode (no dark theme exists yet — do not add one unless explicitly requested), charting library dependencies (SVG only), three-decimal precision, pastel CTAs.
