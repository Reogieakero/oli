# Brand System — OLI Attendance

## Color Tokens

All values are CSS custom properties on `:root` defined in `app/globals.css`.
Every CSS Module references these via `var(--token)` — never hardcode hex values.

| Token | Hex | Usage |
|---|---|---|
| `--color-brand-light` | `#B6DFE6` | Soft backgrounds, subtle surfaces, hover states |
| `--color-brand-accent` | `#3FC7DD` | Primary interactive color, links, focus rings |
| `--color-brand-primary` | `#40A5BE` | Main buttons, headers, brand-forward sections |
| `--color-brand-dark` | `#1F5C6E` | Dark sections, hover/active on primary buttons, text-on-light (derived ~43% darkened from `#40A5BE`) |
| `--color-neutral-900` | `#0F2027` | Body text (near-black, brand-tinted) |
| `--color-neutral-0` | `#FFFFFF` | Page / card background |

Neutrals for borders, dividers, disabled states: use `--color-neutral-900` at low opacity (e.g. `rgba(15, 32, 39, 0.1)`), not arbitrary greys.

## Typography

| Role | Font | Source | Weights |
|---|---|---|---|
| Heading (h1–h3, display) | **Fraunces** | Google Fonts (`next/font/google`) | 400, 600, 700 |
| Body / UI text | **Montserrat** | Google Fonts (`next/font/google`) | 400, 500, 600, 700 |

### Type scale

| Token | Size | Applied to |
|---|---|---|
| `--text-xs` | 12px | Captions |
| `--text-sm` | 14px | Labels, helper text |
| `--text-base` | 16px | Body, paragraphs |
| `--text-lg` | 18px | Lead body, larger UI text |
| `--text-xl` | 22px | h4 |
| `--text-2xl` | 28px | h3 |
| `--text-3xl` | 36px | h2 |
| `--text-4xl` | 48px | h1, display copy |

Fraunces (heading font) is applied only from `--text-2xl` (28px) and above.
Montserrat is used for everything else including buttons, labels, and inputs.

## Spacing Scale

4px base. Tokens: `--space-1` through `--space-24`.

| Token | Pixels |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-24` | 96px |

Cards/sections: default internal padding `--space-6` to `--space-8` (24–32px).
Page gutters: `--space-8` to `--space-16` (32–64px) depending on breakpoint.

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | Inputs, small chips (superseded by --radius-control for inputs) |
| `--radius-md` | 16px | Buttons, small cards |
| `--radius-lg` | 24px | Cards, panels |
| `--radius-full` | 9999px | Pills, avatars, icon buttons |
| `--radius-control` | 8px | Buttons, inputs, selects, dropdowns, badges |
| `--radius-control-sm` | 6px | Checkboxes, small chips, tags |

## Control Sizing

| Token | Value | Usage |
|---|---|---|
| `--control-height-sm` | 32px | Small controls |
| `--control-height-md` | 36px | Default control height |
| `--control-height-lg` | 40px | Large controls |
| `--control-padding-x` | 12px | Horizontal padding for controls |
| `--control-font-size` | 13px | Control label / input text |

## Neutral / Border Scale

Derived from `--color-neutral-900` (`#0F2027`) at varying opacities.

| Token | Opacity | Usage |
|---|---|---|
| `--color-border` | 12% | Default control border |
| `--color-border-hover` | 24% | Hover state border |
| `--color-muted-bg` | 4% | Subtle fills — table stripe, disabled bg |
| `--color-muted-fg` | 56% | Secondary / placeholder text |

## Status Colors

Created for attendance status badges and semantic indicators. Flagged for user sign-off.

| Token | Hex | Usage |
|---|---|---|
| `--color-status-success` | `#2E9E5B` | Present |
| `--color-status-warning` | `#D6A419` | Late |
| `--color-status-danger` | `#D6493D` | Absent |
| `--color-status-neutral` | `#6B7684` | Pending / no data |
| `--color-status-success-bg` | `#E8F5EF` | Success badge fill |
| `--color-status-warning-bg` | `#FBF3DA` | Warning badge fill |
| `--color-status-danger-bg` | `#FBE8E7` | Danger badge fill |
| `--color-status-neutral-bg` | `#EDEEF0` | Neutral badge fill |

## Shadows

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(15, 32, 39, 0.08)` |
| `--shadow-md` | `0 4px 12px rgba(15, 32, 39, 0.10)` |
| `--shadow-lg` | `0 8px 24px rgba(15, 32, 39, 0.12)` |

## Notes

- The brand-dark token was derived by darkening brand-primary (#40A5BE) by ~43%.
  Confirm with client if this matches the intended dark section color.
- Monterchi (the original brand heading font) is a premium Zetafonts family not
  available as a web font via Google/Adobe. Fraunces was chosen as the substitute
  display serif with client confirmation.

## Chart Colors (lib/chartColors.ts)

SVG chart libraries require literal color strings, not `var(--token)`. The
`lib/chartColors.ts` file is an **intentional, manually-synced mirror** of the
CSS tokens — not a duplicate source of truth to "clean up" later without
checking both places. When updating CSS tokens in `globals.css`, update
`chartColors.ts` correspondingly.
