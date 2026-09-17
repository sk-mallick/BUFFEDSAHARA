/**
 * SAHARA · Tailwind configuration (v3 bridge for design tokens v1.0)
 * ======================================================================
 * Single source of truth for the Tailwind side of the system.
 * The plain-CSS mirror lives in ./tokens.css — keep the two in sync.
 *
 * Design choices encoded here:
 *  - Strict scales: spacing is 8pt-only, type is a fixed semantic scale,
 *    radius and shadow are opinionated defaults. Off-system values are
 *    possible only via arbitrary values — they're discouraged.
 *  - Color names come from the physical world of the identity:
 *    sand (canvas), ink (charcoal-navy text), marigold (the one primary),
 *    sage (safe/stable), amber (attention), critical (caseworker-only red).
 *
 * Adjust `content` globs when the app framework is scaffolded in Step 2.
 */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  theme: {
    /* ------------------------------------------------------------------
       COLORS — full override so off-palette utilities don't exist.
       ------------------------------------------------------------------ */
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      white: "#FFFFFF",

      /* Shadcn semantic mappings wired directly to Sahara's palette */
      border: "var(--color-sand-200)",
      input: "var(--color-sand-300)",
      ring: "var(--color-marigold-500)",
      background: "var(--color-sand-50)",
      foreground: "var(--color-ink-900)",
      primary: {
        DEFAULT: "var(--color-marigold-600)",
        foreground: "#FFFFFF",
        hover: "var(--color-marigold-700)",
      },
      secondary: {
        DEFAULT: "var(--color-sand-100)",
        foreground: "var(--color-ink-900)",
      },
      destructive: {
        DEFAULT: "var(--color-critical-600)",
        foreground: "#FFFFFF",
      },
      muted: {
        DEFAULT: "var(--color-sand-100)",
        foreground: "var(--color-ink-500)",
      },
      accent: {
        DEFAULT: "var(--color-marigold-50)",
        foreground: "var(--color-marigold-800)",
      },
      popover: {
        DEFAULT: "#FFFFFF",
        foreground: "var(--color-ink-900)",
      },
      card: {
        DEFAULT: "#FFFFFF",
        foreground: "var(--color-ink-900)",
      },

      sand: {
        50:  "#FAF6EF", // page canvas
        100: "#F4EDE1", // raised surfaces, alt section fields
        200: "#E9DFCE", // hairline borders, dividers
        300: "#D8C9B0", // stronger borders, disabled fills
        400: "#C2B096", // decorative only — never text
      },

      ink: {
        900: "#1F2733", // headlines, primary text
        700: "#3A4350", // body text
        500: "#66707C", // secondary / muted text (AA on white)
        300: "#98A0AA", // placeholders & disabled text ONLY
        100: "#D5DAE0", // disabled borders
      },

      marigold: {
        50:  "#FBF3EC",
        100: "#F6E2D2",
        200: "#EDC5A5",
        300: "#E0A276",
        400: "#D17F4E",
        500: "#B85C33",
        600: "#9E4A26", // PRIMARY action bg, links
        700: "#823C20", // hover
        800: "#652F1A", // pressed
        900: "#472112",
      },

      sage: {
        50:  "#F1F5EE",
        100: "#E0E9DA",
        200: "#C3D3B7",
        300: "#A0B890",
        400: "#7E9D6C",
        500: "#648552",
        600: "#4E6A40", // safe-state text / icons
        700: "#3F5634",
        800: "#32442A",
        900: "#25311F",
      },

      amber: {
        50:  "#FCF6E8",
        100: "#F7E8C6",
        200: "#EDD291",
        300: "#E0B75E",
        400: "#CF9A35",
        500: "#B37D22",
        600: "#93641A", // attention text on light
        700: "#754F15",
        800: "#5A3D12",
      },

      critical: {
        50:  "#FBEFEC",
        100: "#F4DAD3",
        200: "#E6B3A5",
        300: "#D18770",
        400: "#B85F45",
        500: "#A0452D",
        600: "#863723", // alert text
        700: "#6B2C1C",
        // CASEWORKER DASHBOARD ONLY — never on victim-facing surfaces
      },
    },

    /* ------------------------------------------------------------------
       TYPOGRAPHY — semantic scale. Mapping to familiar names:
       xs→caption · sm→small · base→body · lg→body-lg · xl/2xl→h4/h3 ·
       3xl→h2 · 4xl→h1 · 5xl/6xl→display (see style-guide.md §2)
       ------------------------------------------------------------------ */
    fontSize: {
      xs:        ["0.75rem",  { lineHeight: "1rem" }],
      sm:        ["0.875rem", { lineHeight: "1.25rem" }],
      base:      ["1rem",     { lineHeight: "1.5rem" }],
      lg:        ["1.125rem", { lineHeight: "1.75rem" }],
      xl:        ["1.25rem",  { lineHeight: "1.75rem" }],
      "2xl":     ["1.5rem",   { lineHeight: "2rem" }],
      "3xl":     ["1.875rem", { lineHeight: "2.25rem" }],
      "4xl":     ["2.25rem",  { lineHeight: "2.5rem" }],
      "5xl":     ["3rem",     { lineHeight: "1" }],
      eyebrow:   ["0.75rem",  { lineHeight: "1.4",   letterSpacing: "0.12em", fontWeight: "600" }],
      caption:   ["0.8125rem",{ lineHeight: "1.45",  fontWeight: "500" }],
      small:     ["0.875rem", { lineHeight: "1.55",  fontWeight: "400" }],
      body:      ["1rem",     { lineHeight: "1.65",  fontWeight: "400" }],
      "body-lg": ["1.125rem", { lineHeight: "1.7",   fontWeight: "400" }],
      h4:        ["1.25rem",  { lineHeight: "1.3",   fontWeight: "600" }],
      h3:        ["1.5rem",   { lineHeight: "1.25",  fontWeight: "600" }],
      h2:        ["2rem",     { lineHeight: "1.15",  letterSpacing: "-0.01em",  fontWeight: "600" }],
      h1:        ["2.5rem",   { lineHeight: "1.08",  letterSpacing: "-0.015em", fontWeight: "500" }],
      display:   ["3.5rem",   { lineHeight: "1.04",  letterSpacing: "-0.02em",  fontWeight: "500" }],
      "display-xl": ["4.5rem",{ lineHeight: "1.02",  letterSpacing: "-0.025em", fontWeight: "500" }],
      data:      ["0.875rem", { lineHeight: "1.5",   fontWeight: "500" }], // pair with font-mono
    },

    fontFamily: {
      display: ['"Fraunces"', '"Noto Serif Devanagari"', "Georgia", '"Times New Roman"', "serif"],
      sans:    ['"Inter"', '"Noto Sans Devanagari"', "system-ui", '"Segoe UI"', "sans-serif"],
      mono:    ['"IBM Plex Mono"', "ui-monospace", '"SF Mono"', "Menlo", "monospace"],
    },

    /* ------------------------------------------------------------------
       SPACING — 8pt rhythm anchors (0.5rem steps) are the layout standard;
       finer sub-steps (px, 2px, 6px, 10px, 14px) and non-8pt sizes
       (28, 36, 44, 56px…) exist for fixed geometry: icon dots, touch
       targets and circles. Layout gaps and section rhythm stay on the
       8pt steps per style-guide.md §3.
       ------------------------------------------------------------------ */
    spacing: {
      px: "1px",
      0:  "0px",
      0.5: "0.125rem",  // 2px
      1:  "0.25rem",    // 4px
      1.5: "0.375rem",  // 6px
      2:  "0.5rem",     // 8px
      2.5: "0.625rem",  // 10px
      3:  "0.75rem",    // 12px
      3.5: "0.875rem",  // 14px
      4:  "1rem",       // 16px
      5:  "1.25rem",    // 20px
      6:  "1.5rem",     // 24px
      7:  "1.75rem",    // 28px
      8:  "2rem",       // 32px
      9:  "2.25rem",    // 36px
      10: "2.5rem",     // 40px
      11: "2.75rem",    // 44px
      12: "3rem",       // 48px
      14: "3.5rem",     // 56px
      16: "4rem",       // 64px
      20: "5rem",       // 80px
      24: "6rem",       // 96px
      28: "7rem",       // 112px
      32: "8rem",       // 128px
      40: "10rem",      // 160px
      48: "12rem",      // 192px
      64: "16rem",      // 256px
      80: "20rem",      // 320px
      96: "24rem",      // 384px
    },

    /* ------------------------------------------------------------------
       RADIUS — considered defaults: 8px interactive, 16px cards,
       24px modals, pills only for badges/avatars.
       ------------------------------------------------------------------ */
    borderRadius: {
      sm:    "6px",
      md:    "8px",   // inputs, buttons, table cells
      lg:    "12px",  // small cards, dropdowns
      xl:    "16px",  // CARDS, panels
      "2xl": "24px",  // modals, large media frames
      full:  "9999px" // badges, pills, avatars only
    },

    /* ------------------------------------------------------------------
       ELEVATION — soft, low-contrast, ink-tinted.
       ------------------------------------------------------------------ */
    boxShadow: {
      "1": "0 1px 2px rgba(31, 39, 51, 0.05)",
      "2": "0 1px 2px rgba(31, 39, 51, 0.06), 0 2px 6px rgba(31, 39, 51, 0.05)",
      "3": "0 2px 4px rgba(31, 39, 51, 0.05), 0 8px 20px -4px rgba(31, 39, 51, 0.10)",
      "4": "0 4px 8px rgba(31, 39, 51, 0.06), 0 16px 36px -8px rgba(31, 39, 51, 0.14)",
      "5": "0 8px 16px rgba(31, 39, 51, 0.08), 0 28px 64px -12px rgba(31, 39, 51, 0.20)",
      selected: "0 0 0 4px rgba(158, 74, 38, 0.15)", // soft selection halo
    },

    /* ------------------------------------------------------------------
       MOTION — durations in the token scale; easings are decelerating
       or calm. Nothing bounces; nothing springs.
       ------------------------------------------------------------------ */
    transitionDuration: {
      DEFAULT: "240ms",
      micro:   "100ms",
      fast:    "160ms",
      base:    "240ms",
      slow:    "360ms",
      slower:  "560ms",
    },

    transitionTimingFunction: {
      linear:  "linear",
      in:      "cubic-bezier(0.4, 0, 1, 1)",
      out:     "cubic-bezier(0, 0, 0.2, 1)",
      "in-out":"cubic-bezier(0.4, 0, 0.2, 1)",
      gentle:  "cubic-bezier(0.22, 1, 0.36, 1)",  // ease-out, decisive but soft
      soft:    "cubic-bezier(0.45, 0, 0.25, 1)",  // ease-in-out, unhurried
      calm:    "cubic-bezier(0.83, 0, 0.17, 1)",  // near-linear, contemplative
    },

    /* ------------------------------------------------------------------
       ANIMATIONS — the only sanctioned keyframes. Skeleton shimmer runs
       at a slow, steady pace (never frantic).
       ------------------------------------------------------------------ */
    animation: {
      "fade-up":   "fade-up 360ms var(--ease-gentle) both",
      "fade-in":   "fade-in 240ms var(--ease-soft) both",
      "shimmer":   "shimmer 1.8s linear infinite",
      "pulse-soft":"pulse-soft 2.4s ease-in-out infinite",
    },

    keyframes: {
      "fade-up": {
        "0%":   { opacity: "0", transform: "translateY(12px)" },
        "100%": { opacity: "1", transform: "translateY(0)" },
      },
      "fade-in": {
        "0%":   { opacity: "0" },
        "100%": { opacity: "1" },
      },
      shimmer: {
        "0%":   { backgroundPosition: "200% 0" },
        "100%": { backgroundPosition: "-200% 0" },
      },
      "pulse-soft": {
        "0%, 100%": { opacity: "1" },
        "50%":      { opacity: "0.55" },
      },
    },

    /* ------------------------------------------------------------------
       Z-INDEX — a short, named scale beats ad-hoc numbers.
       ------------------------------------------------------------------ */
    zIndex: {
      sticky:  "30",
      nav:     "40",
      drawer:  "50",
      modal:   "60",
      toast:   "70",
    },

    extend: {
      maxWidth: {
        public:    "80rem", // 1280px — marketing site
        narrow:    "44rem", // 704px  — portal reading / forms
        dashboard: "88rem", // 1408px — caseworker work surface
        readable:  "65ch",  // long-form body measure
      },

      /* 12-column grid helpers beyond the default container behaviour. */
      gridTemplateColumns: {
        "public-12": "repeat(12, minmax(0, 1fr))",
      },

      /* Card + panel defaults used across all three experiences. */
      padding: {
        "card":    "1.5rem", // 24px standard card padding
        "card-lg": "2rem",   // 32px generous card padding
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};