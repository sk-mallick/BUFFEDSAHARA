# Sahara · Style Guide v1.0

**Design language:** "Calm Institutional Warmth"
**Product:** Sahara (सहारा) — a government-grade platform (Smart India Hackathon 2026 · SIH26094 · sponsored by the Ministry of Social Justice and Empowerment) that sensitively tracks the psychological wellbeing of people who have filed complaints under the SC/ST (Prevention of Atrocities) Act, 1989 through the NHAA helpline (**14566**) or the integrated grievance portal — and alerts caseworkers when distress is rising, so support arrives before a crisis, not after.
**Experience weight:** one design system, three surfaces (public site / victim portal / caseworker dashboard).

This guide is the written voice of the system. The machine-readable truth lives in `tokens.css` and `tailwind.config.js` — every value named here is defined there.

---

## 0. Art direction

Sahara must feel like a place run by people who have done this work for decades: **quietly competent, institutionally credible, and unmistakably humane.** The reference isn't a tech company — it's the best public institution you've ever walked into: a district hospital that is calm, a government office that is *warm*, a helpline answered by a human who isn't rushing you.

### What Sahara is
- **Warm, not soft.** Sand-colored light, generous space, and ink that is deep navy-charcoal rather than black.
- **Institutional, not corporate.** Hairline rules, numbered processes, statutory footnotes, a visible data-ethics charter. Credibility through *structure*.
- **Human-centered, not "startup."** Copy speaks plainly in the user's language. Motion is unhurried. Nothing gamified.
- **Built for survivors, not dashboards.** The people on screen are trauma survivors, caseworkers, NGO counsellors, and government officials. Every decision is tested against one question: does this calm a frightened person — or just impress a judge?
- **Indian in identity, without kitsch.** The palette draws from marigold garlands, terracotta walls, monsoon light, and the Ashoka navy. It should feel like it *belongs* to the country, not like a foreign template with a Hindi font bolted on.

### What Sahara refuses
- Purple/blue AI-startup gradients, glassmorphism, neon accents — rejected outright.
- Rounded blob illustrations, floating 3D mascots, ChatGPT-wrapper landing-page energy.
- Harsh red on any victim-facing surface. Harsh *anything* on victim-facing surfaces.
- Emoji as icons. Pill-shaped everything. Drop shadows that look like drop shadows.
- Stock photos of distressed people, staged corporate-diversity handshakes, or "helpline operator with headset" clichés.

### The signature: the Arch (threshold)

Sahara's one memorable element is a **single-stroke arch** — a shelter's doorway, drawn as a continuous line in marigold-600 on sand. It is the brand mark (arch + wordmark "Sahara सहारा"), and it recurs as a *structural device*, never as decoration:

- The **ArchRule**: a thin arch outline (SVG, 1.5px stroke) used as a section eyebrow divider.
- The **threshold frame**: hero and feature photography may be presented inside a tall arch-shaped mask (`border-radius: 9999px 9999px 0 0 / 40% 40% 0 0`) — the image becomes a doorway you're invited through.
- **Restraint rule: at most one arch treatment per viewport.** The logo doesn't count.

The arch is the doorway: "you can enter here." That is the entire emotional thesis of the product.

---

## 1. Color

| Token | Name | Role | Hex |
|---|---|---|---|
| `sand-50` | Canvas | Page background (public & dashboard) | `#FAF6EF` |
| `sand-100` | Field | Alt sections, raised surfaces | `#F4EDE1` |
| `sand-200` | Rule | Hairlines, dividers, borders | `#E9DFCE` |
| `ink-900` | Ink | Headlines, primary text | `#1F2733` |
| `ink-700` | Ink-soft | Body text | `#3A4350` |
| `ink-500` | Ink-mute | Secondary text | `#66707C` |
| `marigold-600` | Primary | Buttons, links, key actions | `#9E4A26` |
| `marigold-700` | Primary-hover | Hover states | `#823C20` |
| `sage-600` | Safe | "Supported / stable" states | `#4E6A40` |
| `amber-600` | Attention | "Needs attention" states | `#93641A` |
| `critical-600` | Critical | Caseworker alerts **only** | `#863723` |
| `white` | Card | Cards raised on canvas | `#FFFFFF` |

### Doctrine — how much of each color may appear

- **Sand is the canvas.** On the public site, ≥80% of any viewport is sand/white. The dashboard content area is sand-50 with white cards.
- **Ink is the voice.** Headlines and body are ink; most of what you *read* is ink on sand.
- **Marigold is the accent.** The one primary. Appears as: primary buttons, links, the arch motif, focus rings, and (sparingly) key figures. **Quota: ≤5% of any public viewport.** It is never a full-bleed background, never a gradient wash (except the ≤8% opacity mesh in the illustration system).
- **Sage is earned.** Reserved for states that are true: "supported," "safe," "saved," "verified," "caseworker online." Never decorative.
- **Amber is gentle.** Used for anything that needs attention without alarm: pending items, wait times, "needs support soon." **Always paired with an icon + text label — never color alone.**
- **Critical red is a room, not a color.** It exists only inside the caseworker dashboard, for critical risk alerts and destructive actions. It must never appear on public or portal surfaces — those surfaces use amber and calm wording instead.

### Contrast (checked)

| Pair | Ratio | Use |
|---|---|---|
| marigold-600 on white | 6.0:1 | Primary buttons, links ✓ |
| sage-600 on white | 6.0:1 | Safe-state text ✓ |
| amber-600 on white | 5.1:1 | Attention text ✓ |
| critical-600 on white | 5.5:1 | Caseworker alert text ✓ |
| ink-500 on white | 5.0:1 | Muted text ✓ (small text uses ink-700) |
| ink-300 | 2.6:1 | Placeholders/disabled **only**, never real text |

---

## 2. Typography

### Faces

| Role | Face | Fallbacks | Why |
|---|---|---|---|
| Display / headlines | **Fraunces** | Noto Serif Devanagari, Georgia, serif | High-quality display serif with warmth. Set it *straight*: variable axes at `SOFT 40, WONK 0, opsz auto`, weight 500–600. No wonky curves — dignity over charm. |
| Body / UI | **Inter** | Noto Sans Devanagari, system-ui, sans-serif | Clean grotesk; at 16px+ it reads quietly official. Never below 14px on public surfaces. |
| Data / numerals | **IBM Plex Mono** | ui-monospace, Menlo, monospace | Instrument-panel feel for risk scores, IDs, timestamps, statistics — the dashboard's "reading of instruments." |

All faces are Google Fonts (free, self-hostable, no licensing issues). **Devanagari is a first-class citizen, not a fallback afterthought**: every stack carries its Devanagari pair, and the `html[lang="hi"]` rules in `tokens.css` retune line-height, tracking, and weight automatically.

### Scale (16px root)

| Style | Class | Size | Line-height | Weight | Tracking | Use |
|---|---|---|---|---|---|---|
| Display | `text-display` (`xl:text-display-xl`) | 3.5→4.5rem | 1.04 | 500 | −0.02em | Hero headlines, ~2 per page |
| H1 | `text-h1` | 2.5rem | 1.08 | 500 | −0.015em | Page titles |
| H2 | `text-h2` | 2rem | 1.15 | 600 | −0.01em | Section headings |
| H3 | `text-h3` | 1.5rem | 1.25 | 600 | 0 | Card / block titles |
| H4 | `text-h4` | 1.25rem | 1.3 | 600 | 0 | Sub-blocks, dashboard cards |
| Body-lg | `text-body-lg` | 1.125rem | 1.7 | 400 | 0 | Lead paragraphs, portal reading |
| Body | `text-body` | 1rem | 1.65 | 400 | 0 | Default text |
| Small | `text-small` | 0.875rem | 1.55 | 400 | 0 | Meta, table cells, helpers |
| Caption | `text-caption` | 0.8125rem | 1.45 | 500 | 0 | Labels, timestamps |
| Eyebrow | `text-eyebrow` | 0.75rem | 1.4 | 600 | 0.12em | Section eyebrows (uppercase) |
| Data | `font-mono text-data` | 0.875rem | 1.5 | 500 | 0 | Numbers, risk scores, IDs |

**Usage doctrine**
- Display is a *room*, not a wallpaper: one display headline per viewport, never body copy in serif.
- Body measure: 60–72ch on public, 55–65ch in the portal (more intimate), unrestricted in the dashboard.
- Headlines should never be italic; Fraunces italics read as editorial, not institutional.
- Min sizes: 14px UI text on public/portal (16px preferred); 12px allowed in dashboard tables only.

### Devanagari (Hindi) rules
- Line-height +15–20% (matras stack vertically; tight Latin leading will collide).
- **Never** negative letter-spacing on Devanagari — set tracking to 0.
- Weight one step up from the Latin spec (Devanagari ink coverage renders lighter).
- Latin digits by default; Devanagari digits (`०१२३…`) only when the user's locale setting requests them.
- No justified text in any language; Hindi text-align left.
- Urdu (RTL) future-proofing: keep layout primitives direction-agnostic (`dir="rtl"` + mirrored alignment) so adding Urdu later is a content task, not a rebuild.

---

## 3. Spacing & grid

- **8pt rhythm.** All spacing is a multiple of 8px; 4px exists only as an internal half-step (icon-to-label gaps). Never as layout rhythm. Scale: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128.
- **12-column grid** with gutters: 16px mobile / 24px tablet / 32px desktop. Max-widths: `container-public` 1280px, `container-narrow` 704px (portal), `container-dashboard` 1408px.
- **Generous whitespace is a safety feature.** A distressed reader should never feel crowded. Section padding: 96–128px vertical on the public site; 48–64px in the portal; 24–32px inside the dashboard.
- Surfaces alternate sand-50 → white → sand-100 fields on the public site; the dashboard stays sand-50 with white cards, hairlines in sand-200.
- Hairline rules (`border-sand-200`, 1px) are the primary separation device. Shadows do not separate — they lift (see below).

## 4. Radius & elevation

- **Radius:** 8px interactive elements (inputs, buttons, table cells) · 16px cards · 24px modals · 6px chips · full only for badges/avatars. One default each; no mixing of personalities within a view.
- **Shadows:** four depth steps, all ink-tinted at 5–20% opacity, always `translateY`-focused and soft. `shadow-1` resting cards, `shadow-3` hover lift, `shadow-4` dropdowns/panels, `shadow-5` modals. Rule: if a shadow is visible as a *shape*, it's too hard.
- Borders before shadows: a card on sand-50 gets `border-sand-200` + `shadow-1`. Elevation is earned by interaction, not default chrome.

## 5. Motion

**Principles — "gentle, unhurried, reassuring."** Every motion decision is made as if a frightened person is watching the screen.

- **Never:** bounce, spring/overshoot, elastic, spinning flourishes, parallax, marquee, celebratory confetti, or any animation whose job is to feel *fun*.
- **Durations** from the token scale: `micro` 100ms (color/state), `fast` 160ms (hover), `base` 240ms (standard), `slow` 360ms (overlays), `slower` 560ms (page entrances).
- **Easings:** `ease-gentle` (cubic-bezier(0.22,1,0.36,1)) for entrances — decisive but soft; `ease-soft` for in/out; `ease-calm` for ambient effects.
- **Approved moves:** fade + 8–12px rise for reveals; opacity cross-fades; panels slide up/over at 360ms; toast slides up 8px; skeleton shimmer at 1.8s steady; a slow opacity pulse for "caseworker online" — nothing else without review.
- **Reduced motion** is respected globally (`tokens.css`), and essential feedback (spinners, focus rings) survives it.
- **Framer Motion mapping** (pinned stack): durations map to `transition.duration` seconds — 0.1 / 0.16 / 0.24 / 0.36 / 0.56; `gentle` → `ease: [0.22, 1, 0.36, 1]`; `soft` → `ease: [0.45, 0, 0.25, 1]`; entrance variants are `opacity 0, y 12 → 1, 0` with `viewport={{ once: true }}`. Every motion component calls `useReducedMotion()` and renders the final state when true. Springs are forbidden — `type: "spring"` in a code review is a rejection.
- Public/portal pages animate *once per viewport entry* — no re-triggering on scroll for already-visible content.

## 6. Iconography

- **Outline style, 24px grid** (20px in dense dashboard chrome, 16px inline). Consistent **1.5px stroke** (1.75px at 16px), round caps and joins.
- One accent icon per view maximum (marigold); everything else ink-700.
- Never emoji, never 3D, never filled-duotone gradients. (Lucide React is the pinned set: global `strokeWidth` 1.5 via its context provider, 1.75 at 16px, sizes 20/24.)
- Icons may *support* a label but never replace one; every icon-only control has an `aria-label`.
- The system's own glyph: the single-stroke **arch** mark (SVG). The only custom icon in v1.

## 7. Imagery

### Photography direction

**Warm, authentic, dignity-preserving.** The camera looks at India with respect: soft natural light, muted warm grade, texture you can almost touch.

Source these (Unsplash/Pexels-style, then real program photography when available — prefer the real thing):

- **Hands & care:** a hand resting on a shoulder from behind, two hands clasped over chai, a hand holding a door open, hands folding a dupatta.
- **Thresholds & shelter:** open doorways, an arch in warm light, a courtyard, a jali screen casting shadow, a window with plants, a lit window at dusk, a bench under a tree.
- **Community:** a women's circle at a panchayat, a counsellor's office with warm light, a community meeting, a village street at morning, marigold garlands at a doorway.
- **Quiet landscape:** sunrise over fields, monsoon rain on a tin roof, a kite against pale sky, wheat drying in sun.

Avoid absolutely: faces in distress, tears, visible injury, any child looking upset, staged corporate-diversity photos, "sad person alone in a room" compositions, clinical white rooms, obvious stock smiles, any image that could caption as "victim."

**The dignity test** — an image may ship only if it passes all of:
1. The subject would not be shamed by the photograph.
2. No person is labeled or identifiable as a victim (alt text says *"a counsellor's hand on a shoulder, seen from behind"* — never *"victim being comforted"*).
3. It shows support, calm, or possibility — not pain.
4. Faces, when present, are calm, in profile, or looking away — never mid-distress.

Technical: natural light preferred, soft focus acceptable, 3:2 and 4:5 crops, ≥1600px wide, alt text written with the same dignity rules as the image itself.

### Illustration system (secondary style)

Where photography is inappropriate (empty states, process diagrams, section dividers, the arch motif):

- **Organic line work:** 1.5–2px strokes in ink-900/marigold-600 on sand fields — the arch, a supporting hand, a marigold, a jali fragment. Drawn as single continuous lines wherever possible.
- **Atmospheric mesh:** soft radial gradient blobs in sage/marigold at **≤8% opacity**, used only behind content as atmosphere — never as foreground shapes, never "blob illustrations."
- **Jali texture:** a faint geometric lattice (sand-200, ~4% contrast) usable as a full-bleed texture on public sections.
- Rules: one illustration element per view; illustration never outshines photography; nothing cute, nothing cartoonish.

## 8. Voice & tone

- **Person-first, always.** The product says "people we support," never "victims," in any user-facing copy. "Victim" appears only in statute quotes and caseworker-internal vocabulary.
- **Plain and calm.** Public copy reads at an 8th-grade level; the portal reads even simpler. Short sentences. Active verbs: "Talk to someone now," "Save changes," "I understand my options." Many users have low digital literacy, so every public flow also offers a "call 14566 instead" path.
- **Errors explain and point forward.** "We couldn't save this note. Check your connection and try again" — never "Something went wrong."
- **Never blame.** Not the user, not the caseworker, not the partner organization.
- **Sentence case in UI** ("Talk to someone now", not "TALK TO SOMEONE NOW"). Sentence case in Hindi too.
- **Numbers with context:** "13,000 people supported last year" not "13,000"; risk scores always appear beside a plain-language explanation.
- **Helpline numbers are dialable copy:** 14566 in the largest type on its card, labeled "NHAA — SC/ST helpline," with hours and languages — never only in a footer.
- **The interface names stay stable** across surfaces: the button that says "Talk to someone now" opens the flow whose heading is "Talk to someone now."

## 9. Accessibility (non-negotiables)

- WCAG 2.1 AA minimum everywhere (values in §1 are pre-checked).
- Visible keyboard focus on every interactive element: marigold-600 ring, 2px, offset 2px (inverted to ink on marigold surfaces).
- Touch targets ≥44px on public/portal; ≥40px in the dense dashboard.
- Status never conveyed by color alone — badges pair icon + text.
- All motion honors `prefers-reduced-motion`.
- `lang` set per document and segment; Hindi documents get `lang="hi"` and the Devanagari retuning automatically.
- Charts ship with a data-table fallback and are never the only way to read a number.

## 10. The three experience weights

One system, three registers — enforced by these knobs, not by new tokens:

| Knob | Public site | Victim portal ("My Sahara") | Caseworker dashboard |
|---|---|---|---|
| Type | Serif-led, display headlines | Serif headlines, larger body | Sans-led, compact; mono numerals |
| Density | Editorial, 96–128px sections | Calm, 48–64px sections, narrow column | Dense, 24–32px sections, 12-col |
| Surfaces | Sand fields + white cards | Mostly white, very little chrome | Sand-50 + white cards, ink-900 sidebar |
| Color | Marigold ≤5%, ink-led | Marigold for one primary action; sage for reassurance | Full system incl. critical red |
| Motion | Entrance reveals only | Slower, gentler (360ms baseline) | Fast state feedback (160–240ms) |
| Voice | Informative, inviting | Warm, short, non-clinical | Precise, professional, ethical |