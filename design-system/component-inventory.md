# Sahara · Component Inventory v1.0

Every reusable component the system needs. This is the build checklist for Step 2 (component library) and the constraint for Step 3 (pages).

**Experience tags:** `P` public site · `V` victim portal · `C` caseworker dashboard
**State legend** (applies unless noted): `default · hover · focus-visible · active/pressed · disabled · loading · error · empty`

---

## A. Foundations & layout

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| A1 | Container | P V C | Widths: `public` 80rem / `narrow` 44rem / `dashboard` 88rem; gutters 16/24/32px |
| A2 | Section | P V C | Vertical rhythm 32–128px; fields: sand-50, white, sand-100, sage-50 tint |
| A3 | Grid | P V C | 12-col with breakpoint spans; gutter tokens only |
| A4 | Stack / Inline | P V C | 8pt spacing primitives; inline alignment helpers |
| A5 | Divider | P V C | Hairline sand-200; full / inset variants |
| A6 | **ArchRule** (signature) | P V | Thin marigold arch outline as section divider/eyebrow; max 1 per viewport |
| A7 | PageHeader | P V C | Eyebrow + title + lead + actions; alignment variants |
| A8 | Prose | P V | Long-form (articles, charter, rights pages); 65ch; heading/quote/table styles |
| A9 | MediaFrame | P V | Aspect ratios 3:2, 4:5, arch mask (threshold variant) |

## B. Navigation & wayfinding

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| B1 | PublicTopNav | P | Sticky; transparent-over-hero → sand-50 on scroll; sections, LangSwitcher, "Get help" button, exit button |
| B2 | MobileNav | P V | Sheet (drawer 50), focus-trapped, 44px targets |
| B3 | DashboardSidebar | C | Ink-900; sectioned; collapsible; active-route state (marigold left rule) |
| B4 | Footer | P | Multi-column; helpline strip; statutory links; language switcher |
| B5 | Breadcrumbs | P C | Sand-300 separators; current page not a link |
| B6 | TabBar | P C | Segmented (dashboard) + underline (public) |
| B7 | LangSwitcher | P V | EN / हिंदी; shows current lang; shareable URL switch |
| B8 | **ExitButton** | P V | Escape hatch → neutral page + session hygiene; fixed, keyboard-reachable, never hidden |
| B9 | Stepper | V C | Gentle progress for multi-step flows (check-in, intake); numbered only where order is real |

## C. Actions

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| C1 | Button | P V C | Variants: primary (marigold-600) · secondary (white + ink border) · ghost · quiet (ink-700) · **danger (critical — C only)** · link. Sizes sm/md/lg (40/44/52px). Full-width. Icon+label. Loading (inline spinner, label retained) |
| C2 | IconButton | P V C | 44px target min; aria-label mandatory; tooltip in dense UI |
| C3 | MenuButton | C | Trigger + menu; keyboard nav; grouped actions |
| C4 | RowActions | C | Table row overflow menu; never more than 3 visible actions |

## D. Feedback & overlays

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| D1 | Toast / NotificationCenter | P V C | Tones: neutral · success (sage) · attention (amber) · **critical (C only)**. Stack bottom-right (bottom-center in portal); auto-dismiss 6s, pause on hover, manual close; `role=status`/`alert`, aria-live |
| D2 | AlertBanner | P V C | Inline contextual: sage / amber / **critical (C only)**; icon + title + message + optional action; error variant explains + next step |
| D3 | Modal | P V C | Sizes sm/md/lg; focus trap, Esc, scroll lock; confirm variant carries the tone of the action; 24px radius, shadow-5 |
| D4 | Sheet / Drawer | P V C | Mobile nav, case notes, filters; slides at 360ms ease-gentle |
| D5 | Tooltip | P V C | Hover + focus; never sole affordance on public/portal |
| D6 | Popover | V C | Help text, risk-score explainer |
| D7 | Skeleton | P V C | Text / card / table / avatar; 1.8s steady shimmer; never layout-shifting |
| D8 | EmptyState | P V C | Illustration (line work) or icon; title, body, one action, optional "what's next" line — invitation, not dead end |
| D9 | Spinner | P V C | Small, slow, calm; marigold-600 |
| D10 | ProgressBar / Dots | V C | Check-in & intake steps; gentle; never percentage-stressful |

## E. Forms

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| E1 | Field wrapper | P V C | Label + hint + error + optional mark + char count; states: idle/filled/valid/invalid/disabled; error not color-only (icon + text) |
| E2 | TextField | P V C | md size 44px; `inputMode` variants (tel, numeric, email); validation states |
| E3 | TextArea | P V C | Auto-grow; note-taking in portal/casework |
| E4 | Select | P V C | Native + styled; placeholder; invalid state |
| E5 | RadioGroup | P V | Card variant for check-in emotion scale; large targets |
| E6 | Checkbox | P V C | Consent variant with inline links to charter |
| E7 | Toggle | V C | Privacy controls; on = sage; always labeled both ways |
| E8 | DatePicker | C | Accessible calendar; keyboard complete |
| E9 | SearchField | P C | Resources search + queue search; clear affordance |
| E10 | PhoneInput | V | +91 prefix, national format |
| E11 | OTPField | V | 6-digit, paste-friendly, resend timer with honest countdown |
| E12 | FormActions | V C | Back/Continue pair; Continue keeps its name through the flow |
| E13 | ValidationSummary | V C | Error list at top of long forms, linked to fields |
| E14 | ConsentChecklist | P V | Plain-language consent steps, each linkable to the Data Charter |

## F. Content

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| F1 | Card | P V C | Default / hoverable / interactive; padding md 24px / lg 32px; radius-xl; border + shadow-1, hover shadow-3 |
| F2 | StatCard | C | Number (mono) + label + trend arrow; optional sparkline |
| F3 | MediaCard | P | Photo + dignified alt text + caption; MediaFrame variants |
| F4 | QuoteCard | P | Anonymous quotes, consent-marked; no decorative quotation marks in display type |
| F5 | Accordion | P V | FAQ & rights library; smooth height transition, 240ms |
| F6 | Table | P C | Public: simple, generous. Casework: dense — sortable headers, sticky header, selectable rows, row actions, pagination/load-more, empty state, hairlines only (no zebra) |
| F7 | Badge | P V C | Neutral / sage / amber / **critical (C only)**; icon + text always; dot variant; sm/md |
| F8 | **RiskBadge** | V C | **Caseworker:** Stable (sage) / Monitoring (amber) / Elevated (amber-700) / Critical (critical-600) — icon + label. **Portal twin:** Supported (sage) / In progress (amber) / Needs support soon (amber-600) — **never red on victim-facing screens**, never the word "critical" |
| F9 | Timeline | V C | Vertical checkpoints with status; portal support timeline; case detail milestones; icons + text, never color alone |
| F10 | Avatar | C | Initials on sage-tint fields; roster/assignee |
| F11 | Chip / Tag | P V C | Filter chips, resource tags; selected = marigold-50 fill + marigold-700 text |
| F12 | Callout | P V | Highlight box with marigold left rule; "I need help now" variant |
| F13 | HelplineCard | P V | Number in large mono type, hours, languages, one-tap dial |
| F14 | ModelDisclosure | C | Inline AI score caveat ("aid, not verdict") + rationale link; on queue + case header |
| F15 | SensitiveDataNotice | C | "Handle with care" strip on case records |
| F16 | LegalNote | P V C | Small print block; footer-adjacent |
| F17 | ProcessStep | P | Numbered step for How It Works — numbers only because the process is a sequence |

## G. Data visualization (caseworker-dominant)

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| G1 | ChartCard | C | Wrapper: title, subtitle, legend, period filter, download, loading/empty states |
| G2 | LineChart | C | Trends: distress score, contact cadence; ink line, marigold emphasis, sage positive |
| G3 | TrendSparkline | C | In queue rows and stat cards; 16px tall |
| G4 | ScoreGauge / Donut | C | Risk distribution; palette = RiskBadge colors |
| G5 | DistributionBar | C | Stacked cohort bars |
| G6 | ChartAccessibility | C | Every chart has a data-table fallback; patterns + labels, never color-only; charts render in the system palette only (Recharts or Nivo — theming in implementation.md) |

## H. Portal-specific

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| H1 | WellbeingCheckin | V | Emotion-scale cards (5 points, gentle wording), optional note, always-skip, narrativized result ("You've felt steadier lately") |
| H2 | HelpNowLauncher | V | Persistent, expandable: call helpline / chat now / request a call back; 56px; keyboard accessible; calm presence, not a gamified FAB |
| H3 | PrivacyPanel | V | Consent toggles + "who sees this" per item + export/delete actions |

## I. Caseworker-specific

| # | Component | Tags | Variants / requirements |
|---|---|---|---|
| I1 | RiskQueueRow | C | Anonymized ID, RiskBadge, trend sparkline, last activity, assignee, row actions |
| I2 | QueueToolbar | C | Search, filters, sort (risk score default), batch actions, human-review banner |
| I3 | EscalationPanel | C | Thresholds, SLA timer, escalation path, handoff audit |
| I4 | CaseNotes | C | Sensitivity lock, audit trail, offline-draft notice |
| I5 | ExportMenu | C | CSV/PDF exports; report scheduling |

---

## Directory mapping (pinned stack: atomic architecture)

The inventory maps onto the Vite + React 18 folder structure:

| Folder | Holds | Inventory groups |
|---|---|---|
| `src/ui/` | Primitives — Button, IconButton, Field, Badge, Modal, Tooltip, Spinner, Skeleton, EmptyState… | C, E, D3–D10, F7 |
| `src/components/` | Composed — Card, StatCard, Table, Timeline, ChartCard, Nav, Footer, HelplineCard, RiskBadge, Timeline… | A, B, D1–D2, F (rest), G, H, I |
| `src/sections/` | Page regions — Hero, HelplineStrip, HowItWorksSteps, CheckInSection, QueueToolbar… | assembled from ui/ + components/ |
| `src/pages/` | Routes per information-architecture.md (three experiences) | — |

Rules: ui/ never imports sections or pages; sections/ never imports pages; pages/ only compose. All tokens come from tokens.css / tailwind.config.js — no ad-hoc values in any layer.

## Build order for Step 2

1. Foundations (A) + tokens wired into the app
2. Actions (C1–C3) and Fields (E1–E4) — the two workhorses
3. Feedback (D1–D3) — toasts, alerts, modals
4. Navigation (B1–B3, B7–B8) + Footer
5. Content (F1, F5–F9, F13) — cards, badges, timelines, helpline
6. Tables + charts (F6, G) for the dashboard shell
7. Portal set (H1–H3) + ExitButton verification
8. Three shells assembled from IA, then pages (Step 3)

**Definition of done for the library:** every component ships with default + hover + focus-visible + disabled + loading (where applicable) + error/empty (where applicable), passes AA, honors reduced motion, and is demoed in a token-accurate gallery page.