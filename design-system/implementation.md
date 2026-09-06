# Sahara · Implementation Notes v1.0

How the design system plugs into the pinned stack. **React 18 + Vite · Tailwind CSS (custom tokens) · Framer Motion · React Router · Recharts (or Nivo) · Lucide React.** Atomic architecture: `src/ui/` → `src/components/` → `src/sections/` → `src/pages/`.

---

## 1. Scaffold & wiring

```
npm create vite@latest sahara -- --template react        # React 18
npm i tailwindcss framer-motion react-router-dom recharts lucide-react
```

- Put `tokens.css` and `tailwind.config.js` from this folder into the project root.
- Import tokens once, in the app entry, **before** any component CSS: `import "../tokens.css";`
- Point `tailwind.config.js` `content` at the app sources (already defaulted to `./src/**/*.{js,ts,jsx,tsx,mdx}`).
- **Tailwind version note:** the config is written for v3 (PostCSS). If you adopt **v4** (`@tailwindcss/vite`), the same values translate into an `@theme` block — colors → `--color-*`, spacing → `--spacing-*`, type → `--text-*` (+`--leading-*`, `--tracking-*`), radius → `--radius-*`, shadows → `--shadow-*`, durations → `--duration-*`, easings → `--ease-*`. Keep the names identical so `text-display`, `bg-marigold-600`, etc. work in both.

## 2. Fonts

Self-host via Fontsource (fast, offline-safe, no layout shift) or load from Google Fonts with `display=swap` + preconnect:

- **Fraunces** (variable, opsz 9–144, wght 400–600) — headlines
- **Inter** (400/500/600) — body/UI
- **IBM Plex Mono** (400/500) — data/numerals
- **Noto Serif Devanagari** (400/600) — Hindi headlines
- **Noto Sans Devanagari** (400/600) — Hindi body

`lang="hi"` on `<html>` (or a wrapping div) activates the Devanagari retuning in `tokens.css`.

## 3. Framer Motion — token mapping

| Token | Framer value |
|---|---|
| `--dur-micro` 100ms | `transition={{ duration: 0.1 }}` |
| `--dur-fast` 160ms | `transition={{ duration: 0.16 }}` |
| `--dur-base` 240ms | `transition={{ duration: 0.24 }}` |
| `--dur-slow` 360ms | `transition={{ duration: 0.36 }}` |
| `--dur-slower` 560ms | `transition={{ duration: 0.56 }}` |
| `--ease-gentle` | `ease: [0.22, 1, 0.36, 1]` |
| `--ease-soft` | `ease: [0.45, 0, 0.25, 1]` |
| `--ease-calm` | `ease: [0.83, 0, 0.17, 1]` |

Standard entrance variant (the only sanctioned page/section move):

```jsx
import { motion, useReducedMotion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
};

function Reveal({ children, delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return children;              // final state, no animation
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
```

**Forbidden:** `type: "spring"`, `bounce`, overshoot, scale-pop entrances, and any animation that re-triggers on scroll for already-seen content.

## 4. Recharts — system theming

Create one shared chart theme (also applied to Nivo if used instead — same palette, same rules):

```js
// src/lib/chart-theme.js
export const chartTheme = {
  fontFamily: '"Inter", system-ui, sans-serif',
  fontSize: 12,
  colors: {
    line: "#1F2733",          // ink-900  — primary series
    accent: "#9E4A26",        // marigold-600 — key series (risk)
    safe: "#4E6A40",          // sage-600 — positive/stable
    attention: "#93641A",     // amber-600
    critical: "#863723",      // critical-600 — caseworker only
    grid: "#E9DFCE",          // sand-200 — hairlines, no harsh gridlines
    axis: "#66707C",          // ink-500
  },
  tooltip: {
    contentStyle: {
      background: "#FFFFFF", borderRadius: 12, border: "1px solid #E9DFCE",
      boxShadow: "0 2px 4px rgba(31,39,51,.05), 0 8px 20px -4px rgba(31,39,51,.10)",
      fontFamily: '"Inter", sans-serif', fontSize: 13, color: "#1F2733",
    },
  },
};
```

Rules: gridlines sand-200 at 1px; no gradients on data series; every chart wrapped in `ChartCard` (G1) with title, legend, period filter, loading/empty states, and a data-table fallback (G6). Dashboard charts animate with `isAnimationActive` at 0.4–0.6s linear — no bounce.

## 5. Lucide — stroke consistency

Wrap the app (or set per tree) with one stroke width so every icon draws at 1.5px:

```jsx
import { IconContext } from "lucide-react";
<IconContext.Provider value={{ strokeWidth: 1.5, size: 20 }}>
```

16px inline icons use `strokeWidth={1.75}`; the arch mark is the only custom SVG.

## 6. Router skeleton (per information-architecture.md)

```
/                    Public site (lazy)
/ hi/*               Hindi mirror (same tree, <html lang="hi">)
/portal/*            My Sahara — role-gated
/caseworker/*        Caseworker dashboard — role-gated + 2FA later
```

Use `createBrowserRouter` with a layout route per experience (public layout, portal layout, dashboard layout) so each surface carries its own nav shell. The exit button (B8) lives in the public + portal layouts, not the dashboard.

## 7. Content rules (enforced in Step 3)

- Real, context-accurate copy everywhere — **no lorem ipsum**. Helpline: **NHAA 14566**. Act: *SC/ST (Prevention of Atrocities) Act, 1989*. Platform: MoSJE / SIH26094.
- Person-first language in all user-facing copy ("people we support"); "victim" only in statute quotes and caseworker-internal vocabulary.
- Sentence case in UI. Status never color-only (badge = icon/dot + word).
- Every figure on public/portal surfaces carries a plain-language explanation; risk scores always accompany the ModelDisclosure pattern (C) — "aid to human judgment, not a verdict."